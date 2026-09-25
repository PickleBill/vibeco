/** Pure request policy shared with offline tests. Provider execution stays in wrappers. */
export const MAX_REQUEST_BYTES = 96 * 1024;
export const MAX_COLLECTION_ITEMS = 80;
export const MAX_DEBATE_PERSONAS = 5;
export const ENDPOINT_COST: Readonly<Record<string, number>> = {
  'simulate-idea': 1, 'persona-perspective': 1, 'expand-idea': 1,
  'distill-idea': 1, 'refine-prompt': 2, 'grade-prompt': 1,
  'generate-idea-image': 2, 'generate-alt-prompt': 1, 'synthesize': 2,
  'orchestrate': 9, 'auto-evaluate': 10, 'debate': 6, 'workbench': 6,
  'signal-collect': 3, 'signal-process': 6, 'probe-models': 15,
  'mcp-analyze-usage': 3, 'import-project': 1,
};
export const ADMIN_ENDPOINTS = new Set(['probe-models', 'mcp-analyze-usage']);
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function boundedInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}
/** Stable payload hashing deduplicates double-clicks even with reordered JSON keys. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function primaryTrialInput(endpoint: string, body: Record<string, unknown>): string | null {
  let question: unknown;
  if (endpoint === 'simulate-idea' && (!body.type || body.type === 'initial')) question = body.idea;
  if (endpoint === 'auto-evaluate') question = body.idea;
  if (endpoint === 'workbench' && (!body.action || body.action === 'analyze')) question = body.question;
  if (endpoint === 'debate') question = body.topic;
  return typeof question === 'string' && question.trim()
    ? question.trim().replace(/\s+/g, ' ').toLowerCase() : null;
}
/** Bound fan-out as well as payload size; small JSON can otherwise request many calls. */
export function validateFanout(endpoint: string, body: Record<string, unknown>): string | null {
  if (endpoint === 'debate') {
    const builtIn = Array.isArray(body.personas) ? body.personas.length : 0;
    const custom = isObject(body.custom_personas) ? Object.keys(body.custom_personas).length : 0;
    if (builtIn > MAX_DEBATE_PERSONAS || custom > MAX_DEBATE_PERSONAS) return 'Choose at most five perspectives per request.';
  }
  if (endpoint === 'signal-collect') {
    if (Array.isArray(body.queries) && body.queries.length > 7) return 'Use at most seven search queries.';
    if (Array.isArray(body.sites) && body.sites.length > 3) return 'Use at most three search domains.';
  }
  if (endpoint === 'signal-process' && Array.isArray(body.items) && body.items.length > MAX_COLLECTION_ITEMS) return 'Process at most 80 source items per request.';
  return null;
}
