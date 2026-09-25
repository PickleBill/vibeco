import { publicSourceUrl, type ReportSource, type WorkbenchRequest } from "./workbench-types.ts";

export interface EvidenceBundle { sources: ReportSource[]; documents: { sourceId: string; content: string }[]; limitations: string[]; }
interface ProviderDocument { url?: string; title?: string; markdown?: string; description?: string; metadata?: { sourceURL?: string; title?: string }; }
interface EvidenceOptions { apiKey?: string; fetcher?: typeof fetch; now?: () => Date; }
const API_ORIGIN = "https://api.firecrawl.dev/v2";
const MAX_BYTES = 1_000_000;

async function boundedJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.body) throw new Error("Research provider returned no content.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let output = "";
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error("Research provider response was too large.");
      output += decoder.decode(value, { stream: true });
    }
    output += decoder.decode();
    return JSON.parse(output);
  } finally { await reader.cancel().catch(() => undefined); }
}
async function providerCall(path: "search" | "scrape", body: object, options: EvidenceOptions): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await (options.fetcher ?? fetch)(`${API_ORIGIN}/${path}`, {
      method: "POST", redirect: "error", signal: controller.signal,
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(response.status === 402 ? "Research provider has no available credits." : "Research provider is temporarily unavailable.");
    const json = await boundedJson(response);
    if (json.success === false) throw new Error("Research provider could not retrieve these pages.");
    return json;
  } finally { clearTimeout(timeout); }
}
async function sourceId(url: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return `s_${[...new Uint8Array(digest)].slice(0, 12).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function collectWorkbenchEvidence(input: WorkbenchRequest, options: EvidenceOptions): Promise<EvidenceBundle> {
  const result: EvidenceBundle = { sources: [], documents: [], limitations: [] };
  // Re-fetch previous references: client-supplied report content is not verified evidence.
  const urls = [...new Set([...(input.sourceUrls ?? []), ...(input.priorReport?.sources.map((s) => s.url) ?? [])].map(publicSourceUrl))].slice(0, 5);
  if (input.purpose !== "research" && !urls.length) return result;
  if (!options.apiKey) {
    result.limitations.push("Live source collection is unavailable. Treat this as an analysis of the supplied context; current external claims are not verified.");
    return result;
  }
  let documents: ProviderDocument[] = [];
  if (urls.length) {
    const settled = await Promise.allSettled(urls.map(async (url) => {
      const response = await providerCall("scrape", { url, formats: ["markdown"], onlyMainContent: true, timeout: 15000 }, options);
      const page = response.data as ProviderDocument | undefined;
      return { ...page, url: page?.metadata?.sourceURL ?? url };
    }));
    for (let i = 0; i < settled.length; i++) {
      const item = settled[i];
      if (item.status === "fulfilled") documents.push(item.value);
      else result.limitations.push(`Could not retrieve ${new URL(urls[i]).hostname}; claims depending on that page remain unverified.`);
    }
  } else {
    try {
      const response = await providerCall("search", { query: input.question, limit: 5, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }, options);
      const data = response.data as { web?: ProviderDocument[]; results?: ProviderDocument[] } | ProviderDocument[] | undefined;
      documents = Array.isArray(data) ? data : data?.web ?? data?.results ?? [];
    } catch {
      result.limitations.push("Live research failed or timed out. Current external claims remain unverified.");
    }
  }
  const seen = new Set<string>();
  for (const doc of documents.slice(0, 5)) {
    try {
      const url = publicSourceUrl(doc.url ?? doc.metadata?.sourceURL);
      const content = String(doc.markdown || doc.description || "").trim().slice(0, 8000);
      if (!content || seen.has(url)) continue;
      seen.add(url);
      const id = await sourceId(url);
      const title = String(doc.title || doc.metadata?.title || new URL(url).hostname).slice(0, 500);
      result.sources.push({ id, url, title, retrievedAt: (options.now?.() ?? new Date()).toISOString(), excerpt: content.slice(0, 1200) });
      result.documents.push({ sourceId: id, content });
    } catch { result.limitations.push("An inaccessible or non-public source was omitted."); }
  }
  if (!result.sources.length) result.limitations.push("No supporting web sources were retrieved. This report is provisional, not a verified research finding.");
  return result;
}
