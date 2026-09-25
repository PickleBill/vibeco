import { corsHeaders } from './cors.ts';
import { ADMIN_ENDPOINTS, ENDPOINT_COST, MAX_REQUEST_BYTES, boundedInteger, canonicalJson, isObject, primaryTrialInput, validateFanout } from './request-policy.ts';

type Environment = { get(name: string): string | undefined };
// Native fetch keeps this module testable without importing a remote client SDK.
const environment = (): Environment => (globalThis as unknown as { Deno: { env: Environment } }).Deno.env;
export interface RequestContext {
  userId: string | null;
  isAnonymous: boolean;
  isInternal: boolean;
  isAdmin: boolean;
}
const headers = { ...corsHeaders, 'Access-Control-Allow-Headers': `${corsHeaders['Access-Control-Allow-Headers']}, x-request-id`, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const deny = (code: string, error: string, status: number) => reply({ code, error }, status);
async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body: unknown = JSON.parse(new TextDecoder().decode(bytes) || '{}');
  if (!isObject(body)) throw new Error('INVALID_BODY');
  return body;
}
/** All provider calls are gated by authenticated identity and a durable, atomic reservation.
 * No quota-store outage or missing migration can fall through to paid execution.
 * Service credentials are accepted explicitly, have a separate budget, and are
 * never inferred from a caller-supplied user_id, role, JWT payload, or MCP header.
 */
export async function guardRequest(
  req: Request,
  endpoint: string,
  handler: (body: Record<string, unknown>, context: RequestContext) => Promise<Response>,
): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return deny('METHOD_NOT_ALLOWED', 'Use POST for this tool.', 405);
  if (!ENDPOINT_COST[endpoint]) return deny('UNKNOWN_TOOL', 'This tool has no usage policy.', 503);
  if (Number(req.headers.get('content-length')) > MAX_REQUEST_BYTES) return deny('BODY_TOO_LARGE', 'This request is too large. Shorten the supplied context.', 413);
  let body: Record<string, unknown>;
  try { body = await readBody(req); }
  catch (error) { return deny(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'BODY_TOO_LARGE' : 'INVALID_BODY', 'Send a JSON object within the request size limit.', error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400); }
  const invalidFanout = validateFanout(endpoint, body);
  if (invalidFanout) return deny('REQUEST_LIMIT', invalidFanout, 400);
  const env = environment();
  const url = env.get('SUPABASE_URL');
  const serviceKey = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return deny('USAGE_UNAVAILABLE', 'Usage checks are unavailable. No analysis was started.', 503);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return deny('AUTH_REQUIRED', 'Start a guest session or sign in before running an analysis.', 401);
  const serviceHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const rpc = async (name: string, args: Record<string, unknown>) => {
    const result = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: serviceHeaders, body: JSON.stringify(args), signal: AbortSignal.timeout(10_000) });
    if (!result.ok) throw new Error('Usage storage unavailable');
    return result.status === 204 ? null : await result.json();
  };
  try {
    const context: RequestContext = { userId: null, isAnonymous: false, isInternal: token === serviceKey, isAdmin: token === serviceKey };
    if (!context.isInternal) {
      const authResult = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) });
      if (!authResult.ok) return deny('AUTH_REQUIRED', 'Your session has expired. Sign in and try again.', 401);
      const user: unknown = await authResult.json();
      if (!isObject(user) || typeof user.id !== 'string') return deny('AUTH_REQUIRED', 'A verified session is required.', 401);
      context.userId = user.id;
      context.isAnonymous = user.is_anonymous === true;
      if (ADMIN_ENDPOINTS.has(endpoint) || (endpoint.startsWith('signal-') && (body.persist || !Array.isArray(body.items)))) {
        const roleResult = await fetch(`${url}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin`, { headers: serviceHeaders, signal: AbortSignal.timeout(10_000) });
        if (!roleResult.ok) return deny('ACCESS_UNAVAILABLE', 'Access could not be verified. Try again later.', 503);
        const roles: unknown = await roleResult.json();
        context.isAdmin = Array.isArray(roles) && roles.length > 0;
      }
    }
    if (ADMIN_ENDPOINTS.has(endpoint) && !context.isAdmin) return deny('ADMIN_REQUIRED', 'This diagnostic tool is available to the site owner.', 403);
    if (endpoint.startsWith('signal-') && !context.isAdmin && (body.persist || (endpoint === 'signal-process' && !Array.isArray(body.items)))) {
      return deny('PRIVATE_SCAN_REQUIRED', 'Use a private transient scan with supplied items. Organization storage requires owner access.', 403);
    }
    if (body.report_id !== undefined && body.report_id !== null && !context.isInternal) {
      if (typeof body.report_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.report_id)) return deny('INVALID_REPORT', 'A valid report identifier is required.', 400);
      const ownership = await fetch(`${url}/rest/v1/idea_reports?select=id&id=eq.${encodeURIComponent(body.report_id)}&user_id=eq.${encodeURIComponent(context.userId!)}`, { headers: serviceHeaders, signal: AbortSignal.timeout(10_000) });
      if (!ownership.ok) return deny('ACCESS_UNAVAILABLE', 'Report ownership could not be verified.', 503);
      const rows: unknown = await ownership.json();
      if (!Array.isArray(rows) || !rows.length) return deny('REPORT_NOT_OWNED', 'This report is private or does not belong to your session.', 403);
    }
    const trialInput = primaryTrialInput(endpoint, body);
    const reservation = await rpc('reserve_ai_request', {
      _subject: context.isInternal ? 'internal-service' : context.userId,
      _endpoint: endpoint, _fingerprint: await sha256(canonicalJson(body)),
      _cost: ENDPOINT_COST[endpoint], _is_guest: context.isAnonymous,
      _trial_key: trialInput ? await sha256(trialInput) : null,
      _daily_limit: boundedInteger(env.get(context.isInternal ? 'AI_INTERNAL_DAILY_UNITS' : 'AI_ACCOUNT_DAILY_UNITS'), context.isInternal ? 500 : 120, 2000),
      _guest_limit: boundedInteger(env.get('AI_GUEST_TRIAL_UNITS'), 24, 50),
      _concurrency: boundedInteger(env.get('AI_CONCURRENT_REQUESTS'), 4, 8),
      _global_daily_limit: boundedInteger(env.get('AI_GLOBAL_DAILY_UNITS'), 1000, 10000),
    });
    if (!isObject(reservation)) return deny('USAGE_UNAVAILABLE', 'Usage checks are unavailable. No analysis was started.', 503);
    if (reservation.state === 'replay') return reply(reservation.response, typeof reservation.status === 'number' ? reservation.status : 200);
    if (reservation.state === 'duplicate') return deny(String(reservation.code), 'This request is already running or has just completed. Wait before retrying.', 409);
    if (reservation.code === 'GLOBAL_LIMIT') return deny('GLOBAL_LIMIT', 'The workbench has reached its daily capacity. Saved work and examples are still available.', 429);
    if (reservation.state === 'limited') return deny(String(reservation.code), context.isAnonymous ? 'Your guest trial is complete. Create an account to keep working.' : 'Your daily allowance has been reached. Try again after midnight UTC.', 429);
    if (reservation.state === 'busy') return deny('CONCURRENCY_LIMIT', 'Other analyses are still running. Wait for one to finish.', 429);
    if (reservation.state !== 'reserved' || typeof reservation.id !== 'string') return deny('USAGE_UNAVAILABLE', 'Usage checks are unavailable. No analysis was started.', 503);
    let result: Response;
    try { result = await handler(body, context); }
    catch { result = deny('ANALYSIS_FAILED', 'The analysis did not complete. Try again shortly.', 500); }
    // Reservations count attempts (including provider failures) so retries cannot
    // bypass the budget. Large image results are intentionally not cached in DB.
    let cachedResponse: unknown = null;
    try {
      const text = await result.clone().text();
      if (new TextEncoder().encode(text).byteLength <= 1_048_576) cachedResponse = JSON.parse(text);
    } catch { /* A non-JSON response cannot be replayed. */ }
    try { await rpc('finish_ai_request', { _id: reservation.id, _status: result.status, _response: cachedResponse }); }
    catch { console.error(`[${endpoint}] Usage finalization failed; reservation remains charged.`); }
    return result;
  } catch {
    return deny('USAGE_UNAVAILABLE', 'Access or usage checks are unavailable. No analysis was started.', 503);
  }
}

/** Adapter for legacy wrappers: preserve their input/output contracts. */
export function guardedEndpoint(endpoint: string, handler: (req: Request, context: RequestContext) => Promise<Response>) {
  return (req: Request) => guardRequest(req, endpoint, (body, context) => handler(new Request(req.url, {
    method: 'POST', headers: req.headers, body: JSON.stringify(body), signal: req.signal,
  }), context));
}
