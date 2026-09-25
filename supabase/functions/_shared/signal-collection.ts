/** Source collection only: injectable HTTP transport, no database or model calls. */
export const COLLECTION_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FIRECRAWL_SEARCH = 'https://api.firecrawl.dev/v2/search';
const HN_SEARCH = 'https://hn.algolia.com/api/v1/search';
export interface CollectedSignal {
  source: string; source_url?: string; author_hash?: string;
  title?: string; body: string; product_tag: string; raw: Record<string, unknown>;
}
export interface CollectionStatus {
  source: 'hackernews' | 'firecrawl'; query?: string;
  status: 'success' | 'error' | 'skipped'; collected: number;
  reason?: 'disabled' | 'not_configured' | 'timeout' | 'http_error' | 'provider_limit' | 'invalid_response' | 'network_error';
}
export interface CollectionResult {
  product: string; topic: string | null; collected: number; items: CollectedSignal[];
  sources: { sites: string[]; queries: string[]; status: CollectionStatus[]; via: string[] };
  partial: boolean; warnings: string[];
  error?: string; code?: string;
}
export class CollectionInputError extends Error {}
class SourceError extends Error {
  constructor(readonly reason: CollectionStatus['reason']) { super('Source collection failed'); }
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): string => typeof value === 'string' ? value : '';
function hashAuthor(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) + hash + name.charCodeAt(i)) | 0;
  return `a_${(hash >>> 0).toString(36)}`;
}
function sourceFor(url: string): string {
  let host = '';
  try { host = new URL(url).hostname; } catch { return 'web'; }
  if (host === 'news.ycombinator.com') return 'hackernews';
  if (host === 'reddit.com' || host.endsWith('.reddit.com')) return 'reddit';
  if (host === 'apps.apple.com' || host === 'itunes.apple.com') return 'appstore_review';
  if (host === 'play.google.com') return 'playstore_review';
  return 'web';
}
async function boundedJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel();
    throw new SourceError(response.status === 402 || response.status === 429 ? 'provider_limit' : 'http_error');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new SourceError('invalid_response');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new SourceError('invalid_response'); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new SourceError('invalid_response'); }
}
function arrayInput(value: unknown, fallback: string[], max: number, label: string): string[] {
  if (value === undefined) return fallback;
  if (!Array.isArray(value) || value.length > max || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 500)) throw new CollectionInputError(`${label} must contain at most ${max} short text entries.`);
  return value.map(value => value.trim());
}

/** Empty successful responses are distinct from unavailable providers. */
export async function collectSignals(
  body: Record<string, unknown>,
  dependencies: { fetch?: typeof fetch; firecrawlApiKey?: string; timeoutMs?: number } = {},
): Promise<{ result: CollectionResult; status: 200 | 502 }> {
  const transport = dependencies.fetch ?? fetch;
  const timeoutMs = Math.max(1, Math.min(dependencies.timeoutMs ?? COLLECTION_TIMEOUT_MS, COLLECTION_TIMEOUT_MS));
  const product = text(body.product).trim() || 'general';
  const topic = text(body.topic).trim();
  const queries = arrayInput(body.queries, topic
    ? ['frustrating', 'i wish there was', 'hate that', 'manual process workaround', 'too expensive', 'anyone else struggle with', 'wasting time on'].map(suffix => `${topic} ${suffix}`)
    : ['small business manual process frustrating', 'operations spreadsheet workaround hate', 'i wish there was an app for my business', 'customers complain about scheduling quoting', 'wasting hours on admin work'], 7, 'Queries');
  const sites = arrayInput(body.sites, ['reddit.com'], 3, 'Domains');
  const useHN = body.useHN !== false;
  const useWeb = body.useFirecrawl !== false;
  if (!queries.length || (!useHN && !useWeb)) throw new CollectionInputError('Choose at least one source and one search query.');
  const limit = Math.max(1, Math.min(Number(body.limit) || 6, 10));
  const statuses: CollectionStatus[] = [];
  const tasks: Promise<CollectedSignal[]>[] = [];
  const querySource = (source: CollectionStatus['source'], query: string, task: () => Promise<CollectedSignal[]>) => {
    tasks.push((async () => {
      try {
        const items = await task();
        statuses.push({ source, query, status: 'success', collected: items.length });
        return items;
      } catch (error) {
        const reason = error instanceof SourceError ? error.reason
          : error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'timeout' : 'network_error';
        statuses.push({ source, query, status: 'error', collected: 0, reason });
        return [];
      }
    })());
  };
  if (useHN) {
    for (const query of queries) querySource('hackernews', query, async () => {
      const data = await boundedJson(await transport(`${HN_SEARCH}?query=${encodeURIComponent(query)}&tags=(story,comment)&hitsPerPage=${limit}`, { headers: { 'User-Agent': 'vibeco-signal/1.0' }, signal: AbortSignal.timeout(timeoutMs) }));
      if (!object(data) || !Array.isArray(data.hits)) throw new SourceError('invalid_response');
      return data.hits.filter(object).slice(0, limit).map((hit): CollectedSignal => {
        const id = text(hit.objectID);
        return {
          source: 'hackernews', source_url: id ? `https://news.ycombinator.com/item?id=${encodeURIComponent(id)}` : undefined,
          author_hash: text(hit.author) ? hashAuthor(text(hit.author)) : undefined,
          title: text(hit.title) || text(hit.story_title) || undefined,
          body: (text(hit.comment_text) || text(hit.story_text) || text(hit.title)).replace(/<[^>]+>/g, ' ').trim().slice(0, 4000),
          product_tag: product, raw: { points: hit.points, num_comments: hit.num_comments, created_at: hit.created_at },
        };
      }).filter(item => item.body.length > 24);
    });
  } else statuses.push({ source: 'hackernews', status: 'skipped', reason: 'disabled', collected: 0 });
  if (useWeb && dependencies.firecrawlApiKey) {
    const phrases = queries.flatMap(query => sites.length ? sites.map(site => `site:${site} ${query}`) : [query]);
    for (const query of phrases) querySource('firecrawl', query, async () => {
      const data = await boundedJson(await transport(FIRECRAWL_SEARCH, {
        method: 'POST', headers: { Authorization: `Bearer ${dependencies.firecrawlApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit, ...(body.scrape !== false ? { scrapeOptions: { formats: ['markdown'], onlyMainContent: true } } : {}) }),
        signal: AbortSignal.timeout(timeoutMs),
      }));
      if (!object(data) || data.success === false) throw new SourceError('invalid_response');
      const inner = data.data;
      const list = Array.isArray(inner) ? inner : object(inner) ? inner.web ?? inner.results : null;
      if (!Array.isArray(list)) throw new SourceError('invalid_response');
      return list.filter(object).slice(0, limit).map((entry): CollectedSignal => ({
        source: sourceFor(text(entry.url)), source_url: text(entry.url) || undefined, title: text(entry.title) || undefined,
        body: (text(entry.markdown).trim() || text(entry.description) || text(entry.title)).slice(0, 4000),
        product_tag: product, raw: { description: text(entry.description).slice(0, 500) },
      })).filter(item => item.body.length > 24);
    });
  } else statuses.push({ source: 'firecrawl', status: 'skipped', reason: useWeb ? 'not_configured' : 'disabled', collected: 0 });
  const combined = (await Promise.all(tasks)).flat();
  const seen = new Set<string>();
  const items = combined.filter(item => {
    const key = item.source_url || item.body.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  // Stable output order makes source diagnostics understandable despite parallel HTTP.
  statuses.sort((a, b) => a.source.localeCompare(b.source) || (a.query ?? '').localeCompare(b.query ?? ''));
  const warnings: string[] = [];
  for (const source of ['hackernews', 'firecrawl'] as const) {
    const sourceStatuses = statuses.filter(status => status.source === source);
    const failed = sourceStatuses.filter(status => status.status === 'error');
    const attempted = sourceStatuses.filter(status => status.status !== 'skipped');
    const label = source === 'hackernews' ? 'Hacker News' : 'Web sources';
    if (sourceStatuses.some(status => status.reason === 'not_configured')) warnings.push(`${label} are unavailable because collection is not configured.`);
    if (failed.length) warnings.push(`${label}: ${failed.length} of ${attempted.length} searches failed. Results may be incomplete.`);
  }
  const successes = statuses.filter(status => status.status === 'success');
  const result: CollectionResult = {
    product, topic: topic || null, collected: items.length, items,
    sources: { sites, queries, status: statuses, via: [...new Set(successes.map(status => status.source))] },
    partial: warnings.length > 0, warnings,
  };
  if (!successes.length) return { status: 502, result: { ...result, code: 'COLLECTION_UNAVAILABLE', error: 'Source collection is unavailable. Try again later.' } };
  return { status: 200, result };
}
