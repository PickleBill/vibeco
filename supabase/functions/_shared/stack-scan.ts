// Stack scan: reads a company's public job board (Greenhouse, Lever, Ashby or
// a known Workday board) and lists the data tools its own data and engineering
// job posts name. These are first-party sources, so a tool named here can be
// Confirmed. No API keys: all four boards publish open JSON endpoints.
import { companyHits, squash } from "./match.ts";
import { EMBEDDED_ROLE, labeledUnit, STACK_TOOLS, toolMentions, unitsOf, type StackCategory } from "./stack-tools.ts";
import { workdayBoardFor, type WorkdayBoard } from "./workday-boards.ts";

export type Ats = "greenhouse" | "lever" | "ashby" | "workday";
export const ATS_LABEL: Record<Ats, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", workday: "Workday" };
export const ATS_IDS: Ats[] = ["greenhouse", "lever", "ashby", "workday"];

export interface JobPost {
  title: string;
  url: string;
  text: string;
  location?: string;
}

export interface ToolCount {
  tool: string;
  category: StackCategory;
  /** Posts that name it at all. */
  posts: number;
  /** Posts that name it plainly, not as one option among several. */
  firm: number;
  /** A signal of in-product analytics ("customer-facing dashboards"), not a product. */
  signal?: true;
}

export interface ScannedPost {
  title: string;
  url: string;
  location?: string;
  tools: string[];
  /** Tools this post names plainly. */
  firm: string[];
  /** A data or analytics role (vs. an engineering role). */
  data: boolean;
  /** A role that builds analytics for the company's customers ("Data Product Manager"). */
  embedded_role?: boolean;
  /** Sentences that name the tools, joined with " … ". */
  excerpt: string;
}

export interface StackScan {
  found: boolean;
  ats?: Ats;
  board?: string;
  board_url?: string;
  /** The employer's name as the board gives it (Greenhouse, Workday), else as typed. */
  company_name?: string;
  /** Open roles on the board (Workday: the total its unfiltered search reports). */
  total_jobs: number;
  /** Posts read: every open role (up to 200), or on Workday the roles its searches surface (up to 16). */
  scanned_jobs: number;
  tools: ToolCount[];
  posts: ScannedPost[];
  ms: number;
  /** "greenhouse:chime"-style list of what was tried, for diagnostics. */
  tried: string[];
}

const BUDGET_MS = 6500;
// Workday needs two rounds (searches, then posting details). simulate-idea runs
// the scan alongside the web searches, whose page-text budget is 8.5s, so this
// cap stays under it; a typical Workday read takes 2 to 4s.
const WORKDAY_BUDGET_MS = 8000;
const MAX_SCANNED = 200;
const DATA_ROLE = /\b(data|analytics?|analyst|BI|business intelligence|machine learning|ML|AI|insights?|reporting|scientist|statistic\w*|decision science)\b/i;
const ENG_ROLE = /\b(engineer|engineering|developer|architect|platform)\b/i;

// ─── Text helpers ───

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Greenhouse sends entity-escaped HTML; Lever and Ashby send plain text or HTML. */
export function htmlToText(html: string): string {
  let s = decodeEntities(html);
  if (/<[a-z][\s\S]*>/i.test(s)) {
    s = s
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\s*(br|\/p|\/div|\/li|\/h\d|\/tr)\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<[^>]+>/g, " ");
    s = decodeEntities(s);
  }
  return s.replace(/[ \t\u00a0]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/**
 * The sentences (or list items) that name a tool, de-duplicated, up to ~1500
 * characters. A nice-to-have keeps its label ("Nice to have: Looker"), so the
 * excerpt reads the same out of context.
 */
function toolSentences(text: string, max = 1500): string {
  const parts = unitsOf(text).map(labeledUnit).filter((p) => p.length > 8 && p.length < 500);
  const keep: string[] = [];
  let size = 0;
  for (const p of parts) {
    if (!STACK_TOOLS.some((t) => t.re.test(p)) || keep.includes(p)) continue;
    keep.push(p);
    size += p.length;
    if (size > max) break;
  }
  return keep.join(" … ");
}

// ─── Slugs ───

const LEGAL = /[\s,]+(?:inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh)\.?$/i;

/** Likely board slugs: "Warby Parker" -> warbyparker, warby-parker; "incident.io" -> incident, incidentio. */
export function slugCandidates(company: string, domain?: string): string[] {
  const named = slugsFor(company);
  const fromDomain = domain ? slugsFor(domain) : [];
  // Boards named for the legal entity: "AvidXchange, Inc." hires at avidxchangeinc.
  const legal = named[0] && !/[a-z0-9-]\.[a-z]{2,}/i.test(company) ? [`${named[0]}inc`] : [];
  return [...new Set([...named.slice(0, 2), ...fromDomain.slice(0, 2), ...legal, ...fromDomain, ...named])].slice(0, 4);
}

function slugsFor(company: string): string[] {
  const typed = company.trim().replace(LEGAL, "");
  const host = typed.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  const out: string[] = [];
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) {
    out.push(host.split(".")[0], host.replace(/\./g, ""), host.replace(/\./g, "-"));
  } else {
    const words = typed.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").split(/[\s-]+/).filter(Boolean);
    out.push(words.join(""), words.join("-"));
  }
  return [...new Set(out.filter((s) => /^[a-z0-9][a-z0-9-]{1,60}$/.test(s)))].slice(0, 3);
}

// ─── Board fetchers ───

async function getJson(url: string, signal: AbortSignal, opts: { body?: unknown; headers?: Record<string, string> } = {}): Promise<unknown> {
  const headers = { accept: "application/json", ...opts.headers };
  const res = await fetch(
    url,
    opts.body === undefined
      ? { signal, headers }
      : { signal, method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(opts.body) },
  );
  if (!res.ok) {
    await res.body?.cancel();
    return undefined;
  }
  return await res.json();
}

interface Board {
  ats: Ats;
  slug: string;
  url: string;
  name?: string;
  posts: JobPost[];
  /** Open roles on the board, when it reports more than it sent (Workday). */
  total?: number;
}

type Obj = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function greenhouse(slug: string, signal: AbortSignal): Promise<Board | undefined> {
  const meta = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}`, signal)) as Obj | undefined;
  if (!meta || typeof meta.name !== "string") return undefined;
  const data = (await getJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`, signal)) as Obj | undefined;
  const jobs = Array.isArray(data?.jobs) ? (data!.jobs as Obj[]) : [];
  return {
    ats: "greenhouse",
    slug,
    url: `https://job-boards.greenhouse.io/${slug}`,
    name: meta.name as string,
    posts: jobs.map((j) => ({
      title: str(j.title),
      url: str(j.absolute_url),
      text: htmlToText(str(j.content)),
      location: str((j.location as Obj | undefined)?.name) || undefined,
    })),
  };
}

async function lever(slug: string, signal: AbortSignal): Promise<Board | undefined> {
  const probe = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=1`, signal);
  if (!Array.isArray(probe) || !probe.length) return undefined;
  const data = await getJson(`https://api.lever.co/v0/postings/${slug}?mode=json&limit=200`, signal);
  const jobs = Array.isArray(data) ? (data as Obj[]) : [];
  return {
    ats: "lever",
    slug,
    url: `https://jobs.lever.co/${slug}`,
    posts: jobs.map((j) => {
      const lists = Array.isArray(j.lists) ? (j.lists as Obj[]) : [];
      const listText = lists.map((l) => `${str(l.text)}\n${htmlToText(str(l.content))}`).join("\n");
      return {
        title: str(j.text),
        url: str(j.hostedUrl),
        text: [str(j.descriptionPlain) || htmlToText(str(j.description)), listText, str(j.additionalPlain)].join("\n"),
        location: str((j.categories as Obj | undefined)?.location) || undefined,
      };
    }),
  };
}

async function ashby(slug: string, signal: AbortSignal): Promise<Board | undefined> {
  const data = (await getJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`, signal)) as Obj | undefined;
  const jobs = Array.isArray(data?.jobs) ? (data!.jobs as Obj[]).filter((j) => j.isListed !== false) : [];
  if (!jobs.length) return undefined;
  return {
    ats: "ashby",
    slug,
    url: `https://jobs.ashbyhq.com/${slug}`,
    posts: jobs.map((j) => ({
      title: str(j.title),
      url: str(j.jobUrl),
      text: str(j.descriptionPlain) || htmlToText(str(j.descriptionHtml)),
      location: str(j.location) || undefined,
    })),
  };
}

type SlugAts = Exclude<Ats, "workday">;
const FETCHERS: Record<SlugAts, (slug: string, signal: AbortSignal) => Promise<Board | undefined>> = { greenhouse, lever, ashby };
const ORDER: SlugAts[] = ["greenhouse", "ashby", "lever"];

// ─── Workday ───
// A Workday board can run to thousands of roles and has no feed worth paging
// through, so the scan searches it for data-stack terms, reads the details of
// the most relevant postings, and runs their text through the same checks as
// any other board. A search match alone never counts: only a tool the
// posting's own text names.

/** Tool names first (a posting they surface likely names one), then role words. */
export const WORKDAY_SEARCHES = [
  "Snowflake", "Databricks", "BigQuery", "Redshift", "dbt", "Looker", "Tableau", "Power BI",
  "data engineer", "analytics", "business intelligence",
];
const WORKDAY_TOOL_SEARCHES = 8;
// Some Workday tenants answer 500 to the runtime's default "Accept-Language: *".
const WORKDAY_HEADERS = { "accept-language": "en-US" };
const WORKDAY_PAGE = 20; // the most one Workday search returns
export const WORKDAY_DETAILS = 16;

export interface WorkdayHit {
  title: string;
  path: string;
  location?: string;
  /** How many tool-name searches surfaced it. */
  toolHits: number;
  order: number;
}

/** Resolves when `p` settles or after `ms`, whichever comes first. */
async function within(p: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([p.catch(() => undefined), new Promise((r) => (timer = setTimeout(r, Math.max(0, ms))))]);
  clearTimeout(timer);
}

const WORKDAY_GRACE_MS = 1000;

/**
 * Resolves once every promise settles, but never after `until` (epoch ms), and
 * no later than `graceMs` after three quarters of them have: one slow request
 * out of a dozen shouldn't hold up the scan.
 */
export function settle(promises: Promise<unknown>[], until: number, graceMs = WORKDAY_GRACE_MS): Promise<void> {
  return new Promise((resolve) => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let finished = false;
    const finish = () => {
      finished = true;
      timers.forEach(clearTimeout);
      resolve();
    };
    if (!promises.length) return finish();
    timers.push(setTimeout(finish, Math.max(0, until - Date.now())));
    const quorum = Math.ceil(promises.length * 0.75);
    let done = 0;
    for (const p of promises) {
      p.catch(() => undefined).then(() => {
        if (finished) return;
        done += 1;
        if (done === promises.length) finish();
        else if (done === quorum) timers.push(setTimeout(finish, graceMs));
      });
    }
  });
}

/**
 * Which postings to read: ones a tool-name search surfaced come first, and
 * within each group data and analytics titles before engineering before the
 * rest; at most two with the same title (multi-location copies).
 */
export function pickWorkdayPosts(hits: WorkdayHit[], max = WORKDAY_DETAILS): WorkdayHit[] {
  const tier = (h: WorkdayHit) => (h.toolHits ? 0 : 3) + (DATA_ROLE.test(h.title) ? 0 : ENG_ROLE.test(h.title) ? 1 : 2);
  const sorted = [...hits].sort((a, b) => tier(a) - tier(b) || b.toolHits - a.toolHits || a.order - b.order);
  const perTitle = new Map<string, number>();
  const out: WorkdayHit[] = [];
  for (const h of sorted) {
    const key = h.title.toLowerCase().trim();
    const n = perTitle.get(key) ?? 0;
    if (n >= 2) continue;
    perTitle.set(key, n + 1);
    out.push(h);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Read a known Workday board: an unfiltered search (for the board's size) and
 * WORKDAY_SEARCHES in parallel, then up to WORKDAY_DETAILS posting details in
 * parallel. Each round waits a second at most for its slowest requests, and
 * whatever has arrived by `deadline` (epoch ms) is what gets scanned.
 */
export async function readWorkday(wd: WorkdayBoard, signal: AbortSignal, deadline: number): Promise<Board | undefined> {
  const api = `https://${wd.host}/wday/cxs/${wd.tenant}/${wd.site}`;
  const search = (searchText: string, limit = WORKDAY_PAGE) =>
    getJson(`${api}/jobs`, signal, { body: { searchText, limit, offset: 0, appliedFacets: {} }, headers: WORKDAY_HEADERS })
      .then((d) => d as Obj | undefined)
      .catch(() => undefined);
  // Searches get until two seconds before the deadline; the details get the rest.
  const results: (Obj | undefined)[] = [];
  const searches = [search("", 1), ...WORKDAY_SEARCHES.map((q) => search(q))].map((p, i) => p.then((d) => (results[i] = d)));
  await settle(searches, deadline - 2000);
  if (!results.some((r) => Array.isArray(r?.jobPostings))) return undefined;

  const hits = new Map<string, WorkdayHit>();
  results.slice(1).forEach((r, i) => {
    for (const j of Array.isArray(r?.jobPostings) ? (r!.jobPostings as Obj[]) : []) {
      const path = str(j.externalPath);
      if (!path.startsWith("/") || !str(j.title)) continue;
      const h = hits.get(path) ?? { title: str(j.title), path, location: str(j.locationsText) || undefined, toolHits: 0, order: hits.size };
      if (i < WORKDAY_TOOL_SEARCHES) h.toolHits += 1;
      hits.set(path, h);
    }
  });
  // A search's total counts loose matches; the unfiltered search's is the board's size.
  const total = typeof results[0]?.total === "number" ? (results[0].total as number) : hits.size;

  const picked = pickWorkdayPosts([...hits.values()]);
  const posts: (JobPost | undefined)[] = [];
  const details = picked.map((h, i) =>
    getJson(`${api}${h.path}`, signal, { headers: WORKDAY_HEADERS })
      .then((d) => {
        const info = (d as Obj | undefined)?.jobPostingInfo as Obj | undefined;
        if (!info) return;
        const externalUrl = str(info.externalUrl);
        posts[i] = {
          title: str(info.title) || h.title,
          url: /^https:\/\//.test(externalUrl) ? externalUrl : `https://${wd.host}/${wd.site}${h.path}`,
          text: htmlToText(str(info.jobDescription)),
          location: str(info.location) || h.location,
        };
      })
      .catch(() => undefined)
  );
  await settle(details, deadline);
  // The same description posted for several locations counts once.
  const seen = new Set<string>();
  const read = posts.filter((p): p is JobPost => {
    if (!p?.text) return false;
    const key = `${p.title.toLowerCase()}\n${p.text.slice(0, 2000)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ats: "workday", slug: `${wd.tenant}/${wd.site}`, url: `https://${wd.host}/${wd.site}`, name: wd.company, posts: read, total };
}

/**
 * A slug can belong to a different employer ("mercury" on one board, another
 * Mercury elsewhere). Greenhouse names the board; for the others, the posts
 * themselves must name the company.
 */
function belongsTo(board: Board, company: string): boolean {
  if (board.name) return companyHits(board.name, company).length > 0 || squash(board.name).startsWith(squash(company));
  const sample = board.posts.slice(0, 30);
  return sample.length > 0 && sample.filter((p) => companyHits(`${p.title}\n${p.text.slice(0, 4000)}`, company).length > 0).length >= Math.min(2, sample.length);
}

// ─── Scan ───

export function emptyScan(tried: string[] = [], ms = 0): StackScan {
  return { found: false, total_jobs: 0, scanned_jobs: 0, tools: [], posts: [], ms, tried };
}

/**
 * Count catalog tools across a board's posts: data roles first, then
 * engineering, then everyone else (finance and marketing posts often name the
 * BI tool people actually use).
 */
export function scanBoard(board: Board, company: string, ms = 0, tried: string[] = []): StackScan {
  const titled = board.posts.filter((p) => p.title && p.text);
  const rank = (p: JobPost) => (DATA_ROLE.test(p.title) ? 0 : ENG_ROLE.test(p.title) ? 1 : 2);
  const scanned = [...titled].sort((a, b) => rank(a) - rank(b)).slice(0, MAX_SCANNED);
  const counts = new Map<string, ToolCount>();
  const posts: ScannedPost[] = [];
  for (const p of scanned) {
    const found = toolMentions(p.text);
    const embeddedRole = EMBEDDED_ROLE.test(p.title);
    if (!found.length && !embeddedRole) continue;
    for (const f of found) {
      const c = counts.get(f.tool.name) ??
        { tool: f.tool.name, category: f.tool.category, posts: 0, firm: 0, ...(f.tool.signal ? { signal: true as const } : {}) };
      c.posts += 1;
      if (f.firm) c.firm += 1;
      counts.set(f.tool.name, c);
    }
    posts.push({
      title: p.title,
      url: p.url,
      location: p.location,
      tools: found.map((f) => f.tool.name),
      firm: found.filter((f) => f.firm).map((f) => f.tool.name),
      excerpt: toolSentences(p.text),
      data: DATA_ROLE.test(p.title),
      ...(embeddedRole ? { embedded_role: true } : {}),
    });
  }
  return {
    found: true,
    ats: board.ats,
    board: board.slug,
    board_url: board.url,
    company_name: board.name ?? company,
    total_jobs: Math.max(board.total ?? 0, board.posts.length),
    scanned_jobs: scanned.length,
    tools: [...counts.values()].sort((a, b) => b.firm - a.firm || b.posts - a.posts || a.tool.localeCompare(b.tool)),
    posts,
    ms,
    tried,
  };
}

/** Posts that name at least one tool: how much stack evidence a scan carries. */
const evidence = (scan: StackScan) => scan.posts.filter((p) => p.tools.length > 0).length;

/**
 * Find the company's public board and scan it. Never throws. Greenhouse, Ashby
 * and Lever boards are found by guessing slugs (gives up after ~6.5s); a
 * Workday board only when the company is on the known-board list (~8s, run
 * alongside the slug lookups). When both turn up, the one whose posts name
 * more tools wins; on a tie, the slug board, which lists every open role
 * rather than a search's sample.
 */
export async function scanJobBoards(company: string, budgetMs?: number, domain?: string): Promise<StackScan> {
  const t0 = Date.now();
  const wd = workdayBoardFor(company, domain);
  const slugs = slugCandidates(company, domain);
  if (!slugs.length && !wd) return emptyScan();
  const budget = budgetMs ?? (wd ? WORKDAY_BUDGET_MS : BUDGET_MS);
  // Separate controllers: finding a slug board cancels the other slug lookups, not the Workday read.
  const slugController = new AbortController();
  const wdController = new AbortController();
  const timer = setTimeout(() => {
    slugController.abort();
    wdController.abort();
  }, budget);
  const attempts = ORDER.flatMap((ats) => slugs.map((slug) => ({ ats, slug })));
  const tried = [...(wd ? [`workday:${wd.tenant}/${wd.site}`] : []), ...attempts.map((a) => `${a.ats}:${a.slug}`)];
  // All slug lookups start at once; take the first verified board in preference
  // order (Greenhouse, Ashby, Lever) and cancel the rest.
  const firstSlugBoard = async (): Promise<Board | undefined> => {
    const pending = attempts.map(({ ats, slug }) => FETCHERS[ats](slug, slugController.signal).catch(() => undefined));
    for (const p of pending) {
      const board = await p;
      if (board && board.posts.length > 0 && belongsTo(board, company)) {
        slugController.abort();
        return board;
      }
    }
    return undefined;
  };
  try {
    let slugBoard: Board | undefined;
    const slugDone = firstSlugBoard().then((b) => (slugBoard = b), () => undefined);
    const wdBoard = wd ? await readWorkday(wd, wdController.signal, t0 + budget - 150).catch(() => undefined) : undefined;
    // With the Workday posts in hand, a slow slug lookup gets one more second, not the whole budget.
    await (wdBoard?.posts.length ? within(slugDone, 1000) : slugDone);
    const ms = Date.now() - t0;
    const scans = [slugBoard, wdBoard].filter((b): b is Board => !!b && b.posts.length > 0).map((b) => scanBoard(b, company, ms, tried));
    if (!scans.length) return emptyScan(tried, ms);
    return scans.reduce((best, s) => (evidence(s) > evidence(best) ? s : best));
  } finally {
    clearTimeout(timer);
    slugController.abort();
    wdController.abort();
  }
}

/**
 * The fewest posts that cover the most tools (up to `max`), as research
 * sources: the company's own job posts, cited like any other source.
 */
export function scanSources(scan: StackScan, max = 4): { title: string; url: string; snippet: string; excerpt: string; via: Ats }[] {
  if (!scan.found || !scan.ats) return [];
  const label = ATS_LABEL[scan.ats];
  const company = scan.company_name ?? "";
  // Coverage is tracked twice: a tool is "confirmed" only once a picked post
  // names it plainly; a hedged mention covers it for the "any mention" pass.
  const leftFirm = new Set(scan.tools.filter((t) => t.firm > 0).map((t) => t.tool));
  const leftAny = new Set(scan.tools.map((t) => t.tool));
  const pool = scan.posts.filter((p) => /^https?:\/\//.test(p.url));
  const picked: ScannedPost[] = [];
  // Score: plainly named embedded work counts most (it decides the motion), a
  // confirmed BI tool next (it's what a BI seller replaces), then any newly
  // confirmed tool, then a new hedged mention; data roles break ties.
  const category = new Map(scan.tools.map((t) => [t.tool, t.category]));
  let roleShown = false;
  const score = (p: ScannedPost) => {
    let sum = p.data ? 0.5 : 0;
    if (p.embedded_role && !roleShown) sum += 3.5;
    for (const t of p.tools) {
      const cat = category.get(t);
      if (p.firm.includes(t) && leftFirm.has(t)) sum += cat === "Embedded analytics" ? 4 : cat === "BI tools" ? 3 : 2;
      else if (leftAny.has(t)) sum += 1;
    }
    return sum;
  };
  while (picked.length < max && (leftFirm.size || leftAny.size || !roleShown)) {
    let best: ScannedPost | undefined;
    let top = 0.5;
    for (const p of pool) {
      if (picked.includes(p)) continue;
      const s = score(p);
      if (s > top) {
        best = p;
        top = s;
      }
    }
    if (!best) break;
    picked.push(best);
    if (best.embedded_role) roleShown = true;
    best.firm.forEach((t) => leftFirm.delete(t));
    best.tools.forEach((t) => leftAny.delete(t));
  }
  return picked.map((p) => {
    const options = p.tools.filter((t) => !p.firm.includes(t));
    const named = [
      p.firm.length ? `names ${p.firm.join(", ")}` : "",
      options.length ? `lists ${options.join(", ")} as options` : "",
      !p.tools.length && p.embedded_role ? "is a role building analytics for its customers" : "",
    ].filter(Boolean);
    return {
      title: `${p.title} at ${company} (${label} job post)`,
      url: p.url,
      snippet: `${company}'s own job post${p.location ? ` (${p.location})` : ""} ${named.join("; ")}.`,
      excerpt: `${p.title} at ${company}\n${p.excerpt}`,
      via: scan.ats!,
    };
  });
}

/** What the page shows about the scan: counts only, no post text. Embedded tools always make the cut. */
export function scanSummary(scan: StackScan) {
  const top = scan.tools.slice(0, 16);
  const embedded = scan.tools.filter((t) => t.category === "Embedded analytics" && !top.includes(t));
  return {
    found: scan.found,
    ...(scan.ats ? { ats: scan.ats } : {}),
    ...(scan.board_url ? { board_url: scan.board_url } : {}),
    ...(scan.company_name ? { company_name: scan.company_name } : {}),
    total_jobs: scan.total_jobs,
    scanned_jobs: scan.scanned_jobs,
    tools: [...top.slice(0, 16 - embedded.length), ...embedded],
    ms: scan.ms,
  };
}
export type ScanSummary = ReturnType<typeof scanSummary>;
