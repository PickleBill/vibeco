// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { collectSignals, CollectionInputError } from '../../../supabase/functions/_shared/signal-collection';

const query = { queries: ['operations pain'], persist: false };
const hnHit = { objectID: '42', author: 'private-handle', comment_text: 'Scheduling jobs manually wastes several hours every week.' };
const webHit = { url: 'https://example.test/research', title: 'Workflow evidence', description: 'A sourced discussion about scheduling work across small teams.' };
const transport = (handler: (url: string, init?: RequestInit) => Promise<Response> | Response) => vi.fn((input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(handler(String(input), init)));

describe('truthful source collection', () => {
  it('keeps usable HN items when the web provider fails, including exhausted credit', async () => {
    for (const status of [402, 429, 500]) {
      const fetch = transport(url => url.includes('algolia') ? Response.json({ hits: [hnHit] }) : new Response('secret provider body', { status }));
      const { result, status: httpStatus } = await collectSignals(query, { fetch, firecrawlApiKey: 'test-only' });
      expect(httpStatus).toBe(200);
      expect(result.items).toHaveLength(1);
      expect(result.partial).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.sources.status).toContainEqual(expect.objectContaining({ source: 'firecrawl', status: 'error' }));
      expect(JSON.stringify(result)).not.toContain('secret provider body');
      expect(result.items[0].author_hash).not.toContain('private-handle');
    }
  });
  it('keeps web results when HN network calls fail', async () => {
    const fetch = transport(url => { if (url.includes('algolia')) throw new Error('sensitive transport exception'); return Response.json({ data: { web: [webHit] } }); });
    const { result, status } = await collectSignals(query, { fetch, firecrawlApiKey: 'test-only' });
    expect(status).toBe(200);
    expect(result.items[0].source_url).toBe(webHit.url);
    expect(result.sources.via).toEqual(['firecrawl']);
    expect(result.partial).toBe(true);
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });
  it('labels missing configuration as skipped and reports incomplete coverage', async () => {
    const fetch = transport(() => Response.json({ hits: [hnHit] }));
    const { result, status } = await collectSignals(query, { fetch });
    expect(status).toBe(200);
    expect(result.partial).toBe(true);
    expect(result.sources.status).toContainEqual({ source: 'firecrawl', status: 'skipped', reason: 'not_configured', collected: 0 });
    expect(result.warnings[0]).toContain('not configured');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('returns 502 for total source failure or no configured usable provider', async () => {
    const fetch = transport(() => new Response('private provider details', { status: 503 }));
    const allFailed = await collectSignals(query, { fetch, firecrawlApiKey: 'test-only' });
    expect(allFailed.status).toBe(502);
    expect(allFailed.result.code).toBe('COLLECTION_UNAVAILABLE');
    expect(allFailed.result.items).toHaveLength(0);
    expect(JSON.stringify(allFailed.result)).not.toContain('private provider details');
    const notConfigured = await collectSignals({ ...query, useHN: false }, { fetch });
    expect(notConfigured.status).toBe(502);
    expect(notConfigured.result.sources.status.every(source => source.status === 'skipped')).toBe(true);
  });
  it('accepts genuine empty successful responses and does not confuse them with errors', async () => {
    const fetch = transport(url => url.includes('algolia') ? Response.json({ hits: [] }) : Response.json({ data: [] }));
    const complete = await collectSignals(query, { fetch, firecrawlApiKey: 'test-only' });
    expect(complete.status).toBe(200);
    expect(complete.result).toMatchObject({ collected: 0, partial: false, warnings: [] });
    expect(complete.result.sources.status.every(source => source.status === 'success')).toBe(true);
    const partial = await collectSignals(query, { fetch: transport(url => url.includes('algolia') ? Response.json({ hits: [] }) : new Response(null, { status: 500 })), firecrawlApiKey: 'test-only' });
    expect(partial.status).toBe(200);
    expect(partial.result).toMatchObject({ collected: 0, partial: true });
  });
  it('bounds slow provider calls and reports timeout without exposing exception text', async () => {
    const fetch = transport((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('private timeout context', 'TimeoutError')), { once: true });
    }));
    const { result, status } = await collectSignals({ ...query, useFirecrawl: false }, { fetch, timeoutMs: 5 });
    expect(status).toBe(502);
    expect(result.sources.status).toContainEqual(expect.objectContaining({ source: 'hackernews', status: 'error', reason: 'timeout' }));
    expect(JSON.stringify(result)).not.toContain('private timeout context');
  });
  it('treats invalid JSON/schema and oversized provider data as errors, not empty results', async () => {
    for (const response of [new Response('not-json'), Response.json({ noHits: true }), new Response('x'.repeat(2 * 1024 * 1024 + 1))]) {
      const { result, status } = await collectSignals({ ...query, useFirecrawl: false }, { fetch: transport(() => response) });
      expect(status).toBe(502);
      expect(result.sources.status).toContainEqual(expect.objectContaining({ reason: 'invalid_response' }));
    }
  });
  it('does not mark intentionally disabled sources as missing coverage, and deduplicates source URLs', async () => {
    const fetch = transport(() => Response.json({ hits: [hnHit, hnHit] }));
    const { result } = await collectSignals({ ...query, useFirecrawl: false }, { fetch });
    expect(result.items).toHaveLength(1);
    expect(result.partial).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.sources.status).toContainEqual(expect.objectContaining({ source: 'firecrawl', status: 'skipped', reason: 'disabled' }));
  });
  it('rejects invalid query choices before invoking HTTP', async () => {
    const fetch = transport(() => Response.json({}));
    await expect(collectSignals({ queries: [] }, { fetch })).rejects.toBeInstanceOf(CollectionInputError);
    await expect(collectSignals({ ...query, useHN: false, useFirecrawl: false }, { fetch })).rejects.toBeInstanceOf(CollectionInputError);
    await expect(collectSignals({ queries: 'not an array' }, { fetch })).rejects.toBeInstanceOf(CollectionInputError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
