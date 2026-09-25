// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { guardRequest, guardedEndpoint } from '../../../supabase/functions/_shared/request-guard';
import { canonicalJson, primaryTrialInput, validateFanout } from '../../../supabase/functions/_shared/request-policy';

const uid = '00000000-0000-4000-8000-000000000001';
const env = { SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'internal-secret' };
let reservation: Record<string, unknown>;
let calls: { path: string; body?: Record<string, unknown> }[];
let fetchMock: ReturnType<typeof vi.fn>;
const request = (body: unknown = { idea: 'A useful thing', type: 'initial' }, token: string | null = 'guest-token') => new Request('https://test.invalid/functions/v1/simulate-idea', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
const execute = vi.fn(async (_body: unknown, _context: unknown) => new Response(JSON.stringify({ summary: 'Worked' }), { status: 200 }));

beforeEach(() => {
  execute.mockClear();
  reservation = { state: 'reserved', id: 'test-reservation' };
  calls = [];
  vi.stubGlobal('Deno', { env: { get: (key: keyof typeof env) => env[key] } });
  fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    const path = new URL(url).pathname;
    calls.push({ path, body: options?.body ? JSON.parse(String(options.body)) : undefined });
    if (path.endsWith('/auth/v1/user')) return Response.json({ id: uid, is_anonymous: true });
    if (path.includes('/user_roles')) return Response.json([]);
    if (path.endsWith('/reserve_ai_request')) return Response.json(reservation);
    if (path.endsWith('/finish_ai_request')) return new Response(null, { status: 204 });
    if (path.includes('/idea_reports')) return Response.json([]);
    throw new Error('Unexpected network call');
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('provider request guard', () => {
  it('handles preflight without authentication or paid execution', async () => {
    const response = await guardRequest(new Request('https://test.invalid', { method: 'OPTIONS' }), 'simulate-idea', execute);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-request-id');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
  it('rejects callers without a verified session', async () => {
    expect((await guardRequest(request({}, null), 'simulate-idea', execute)).status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });
  it('reserves and finalizes usage around exactly one provider execution', async () => {
    expect((await guardRequest(request(), 'simulate-idea', execute)).status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(calls.map(call => call.path)).toEqual(['/auth/v1/user', '/rest/v1/rpc/reserve_ai_request', '/rest/v1/rpc/finish_ai_request']);
    expect(calls[1].body).toMatchObject({ _subject: uid, _is_guest: true, _guest_limit: 24, _global_daily_limit: 1000 });
    expect(calls[1].body?._trial_key).toMatch(/^[0-9a-f]{64}$/);
  });
  it('does not trust caller supplied user IDs or roles', async () => {
    await guardRequest(request({ idea: 'x', user_id: 'victim', role: 'service_role' }), 'simulate-idea', execute);
    expect(calls[1].body?._subject).toBe(uid);
    expect(execute.mock.calls[0]?.[1]).toMatchObject({ isInternal: false, userId: uid });
  });
  it('fails closed when durable quota storage is unavailable', async () => {
    fetchMock.mockImplementation(async (url: string) => url.includes('/auth/') ? Response.json({ id: uid }) : new Response('Unavailable', { status: 503 }));
    const response = await guardRequest(request(), 'simulate-idea', execute);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: 'USAGE_UNAVAILABLE' });
    expect(execute).not.toHaveBeenCalled();
  });
  it.each(['duplicate', 'limited', 'busy'])('never executes rejected %s requests', async (state) => {
    reservation = { state, code: 'GUEST_TRIAL_USED' };
    const response = await guardRequest(request(), 'simulate-idea', execute);
    expect(response.status).toBe(state === 'duplicate' ? 409 : 429);
    expect(execute).not.toHaveBeenCalled();
  });
  it('replays a previous result without consuming another provider call', async () => {
    reservation = { state: 'replay', response: { summary: 'Cached' }, status: 200 };
    const response = await guardRequest(request(), 'simulate-idea', execute);
    expect(await response.json()).toEqual({ summary: 'Cached' });
    expect(execute).not.toHaveBeenCalled();
  });
  it('denies public diagnostics and organization scans', async () => {
    expect((await guardRequest(request({}), 'probe-models', execute)).status).toBe(403);
    expect((await guardRequest(request({ persist: true }), 'signal-collect', execute)).status).toBe(403);
    expect((await guardRequest(request({}), 'signal-process', execute)).status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
  it('allows transient research but not another report owner context', async () => {
    expect((await guardRequest(request({ items: [], persist: false }), 'signal-process', execute)).status).toBe(200);
    execute.mockClear();
    expect((await guardRequest(request({ idea: 'x', report_id: uid }), 'orchestrate', execute)).status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
  it('accounts internal service callers separately and still enforces limits', async () => {
    const response = await guardRequest(request({}, 'internal-secret'), 'probe-models', execute);
    expect(response.status).toBe(200);
    expect(calls[0].body).toMatchObject({ _subject: 'internal-service', _daily_limit: 500 });
    expect(calls.some(call => call.path === '/auth/v1/user')).toBe(false);
  });
  it('bounds payload bytes and fanout before touching a provider', async () => {
    expect((await guardRequest(request({ context: 'x'.repeat(100_000) }), 'simulate-idea', execute)).status).toBe(413);
    expect((await guardRequest(request({ personas: Array(6).fill('builder') }), 'debate', execute)).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
  it('preserves legacy request JSON and credential headers in the adapter', async () => {
    const wrapped = guardedEndpoint('simulate-idea', async req => {
      expect(req.headers.get('Authorization')).toBe('Bearer guest-token');
      return Response.json(await req.json());
    });
    expect(await (await wrapped(request())).json()).toEqual({ idea: 'A useful thing', type: 'initial' });
  });
});

describe('stable request policy', () => {
  it('deduplicates object key order while preserving semantically ordered arrays', () => {
    expect(canonicalJson({ b: 1, a: { y: 2, x: 3 } })).toBe(canonicalJson({ a: { x: 3, y: 2 }, b: 1 }));
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });
  it('bounds custom definitions without double-counting named overrides', () => {
    expect(validateFanout('debate', { personas: ['a', 'b'], custom_personas: { a: '', b: '', c: '', d: '', e: '', f: '' } })).toBeTruthy();
    expect(validateFanout('debate', { personas: ['a', 'b', 'c'], custom_personas: { a: '', b: '', c: '' } })).toBeNull();
  });
  it('binds a guest primary trial without treating refinements as new reports', () => {
    expect(primaryTrialInput('simulate-idea', { idea: '  Useful   Idea ', type: 'initial' })).toBe('useful idea');
    expect(primaryTrialInput('simulate-idea', { idea: 'Useful Idea', type: 'final' })).toBeNull();
  });
});
