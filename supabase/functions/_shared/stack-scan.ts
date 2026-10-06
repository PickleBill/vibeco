// Stack scan: reads a company's public job board (Greenhouse, Lever or Ashby)
// and lists the data tools its own data and engineering job posts name. These
// are first-party sources, so a tool named here can be Confirmed. No API keys:
// all three boards publish open JSON endpoints.
import { companyHits, squash } from "./match.ts";
import { STACK_TOOLS, toolMentions, type StackCategory } from "./stack-tools.ts";

export type Ats = "greenhouse" | "lever" | "ashby";
export const ATS_LABEL: Record<Ats, string> = { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby" };

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
  /** Sentences that name the tools, joined with " … ". */
  excerpt: string;
}

export interface StackScan {
  found: boolean;
  ats?: Ats;
  board?: string;
  board_url?: string;
  /** The employer's name as the board gives it (Greenhouse), else as typed. */
  company_name?: string;
  total_jobs: number;
  scanned_jobs: number;
  tools: ToolCount[];
  posts: ScannedPost[];
  ms: number;
  /** "greenhouse:chime"-style list of what was tried, for diagnostics. */
  tried: string[];
}

const BUDGET_MS = 6500;
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

/** The sentences (or list items) that name a tool, de-duplicated, up to ~1500 characters. */
function toolSentences(text: string, max = 1500): string {
  const parts = text.split(/(?<=[.!?])\s+|\n+/).map((p) => p.trim()).filter((p) => p.length > 8 && p.length < 500);
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
export function slugCandidates(company: string): string[] {
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

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
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

const FETCHERS: Record<Ats, (slug: string, signal: AbortSignal) => Promise<Board | undefined>> = { greenhouse, lever, ashby };
const ORDER: Ats[] = ["greenhouse", "ashby", "lever"];

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
    if (!found.length) continue;
    for (const f of found) {
      const c = counts.get(f.tool.name) ?? { tool: f.tool.name, category: f.tool.category, posts: 0, firm: 0 };
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
    });
  }
  return {
    found: true,
    ats: board.ats,
    board: board.slug,
    board_url: board.url,
    company_name: board.name ?? company,
    total_jobs: board.posts.length,
    scanned_jobs: scanned.length,
    tools: [...counts.values()].sort((a, b) => b.firm - a.firm || b.posts - a.posts || a.tool.localeCompare(b.tool)),
    posts,
    ms,
    tried,
  };
}

/** Find the company's public board and scan it. Never throws; gives up after ~6.5s. */
export async function scanJobBoards(company: string, budgetMs = BUDGET_MS): Promise<StackScan> {
  const t0 = Date.now();
  const slugs = slugCandidates(company);
  if (!slugs.length) return emptyScan();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), budgetMs);
  const attempts = ORDER.flatMap((ats) => slugs.map((slug) => ({ ats, slug })));
  const tried = attempts.map((a) => `${a.ats}:${a.slug}`);
  // All lookups start at once; take the first verified board in preference
  // order (Greenhouse, Ashby, Lever) and cancel the rest.
  const pending = attempts.map(({ ats, slug }) => FETCHERS[ats](slug, controller.signal).catch(() => undefined));
  try {
    for (const p of pending) {
      const board = await p;
      if (board && board.posts.length > 0 && belongsTo(board, company)) {
        controller.abort();
        return scanBoard(board, company, Date.now() - t0, tried);
      }
    }
    return emptyScan(tried, Date.now() - t0);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The fewest posts that cover the most tools (up to `max`), as research
 * sources: the company's own job posts, cited like any other source.
 */
export function scanSources(scan: StackScan, max = 5): { title: string; url: string; snippet: string; excerpt: string; via: Ats }[] {
  if (!scan.found || !scan.ats) return [];
  const label = ATS_LABEL[scan.ats];
  const company = scan.company_name ?? "";
  // Coverage is tracked twice: a tool is "confirmed" only once a picked post
  // names it plainly; a hedged mention covers it for the "any mention" pass.
  const leftFirm = new Set(scan.tools.filter((t) => t.firm > 0).map((t) => t.tool));
  const leftAny = new Set(scan.tools.map((t) => t.tool));
  const pool = scan.posts.filter((p) => /^https?:\/\//.test(p.url));
  const picked: ScannedPost[] = [];
  // Score: a confirmed BI tool counts most (it's what a BI seller replaces),
  // any newly confirmed tool next, a new hedged mention least; data roles break ties.
  const category = new Map(scan.tools.map((t) => [t.tool, t.category]));
  const score = (p: ScannedPost) => {
    let sum = p.data ? 0.5 : 0;
    for (const t of p.tools) {
      if (p.firm.includes(t) && leftFirm.has(t)) sum += category.get(t) === "BI tools" ? 3 : 2;
      else if (leftAny.has(t)) sum += 1;
    }
    return sum;
  };
  while (picked.length < max && (leftFirm.size || leftAny.size)) {
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
    best.firm.forEach((t) => leftFirm.delete(t));
    best.tools.forEach((t) => leftAny.delete(t));
  }
  return picked.map((p) => {
    const options = p.tools.filter((t) => !p.firm.includes(t));
    const named = [
      p.firm.length ? `names ${p.firm.join(", ")}` : "",
      options.length ? `lists ${options.join(", ")} as options` : "",
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

/** What the page shows about the scan: counts only, no post text. */
export function scanSummary(scan: StackScan) {
  return {
    found: scan.found,
    ...(scan.ats ? { ats: scan.ats } : {}),
    ...(scan.board_url ? { board_url: scan.board_url } : {}),
    ...(scan.company_name ? { company_name: scan.company_name } : {}),
    total_jobs: scan.total_jobs,
    scanned_jobs: scan.scanned_jobs,
    tools: scan.tools.slice(0, 16),
    ms: scan.ms,
  };
}
export type ScanSummary = ReturnType<typeof scanSummary>;
