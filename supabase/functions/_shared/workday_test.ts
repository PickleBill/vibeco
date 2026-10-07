// Workday boards in the job-board scan: the known-board registry, the reader
// (searches, then posting details; fetch is stubbed, no network), how its posts
// flow into a scan, and the everyday words that must never count as a tool.
import { assert, assertEquals, assertMatch } from "jsr:@std/assert@1";
import { workdayBoardFor, WORKDAY_BOARDS } from "./workday-boards.ts";
import { pickWorkdayPosts, readWorkday, scanJobBoards, scanSources, scanSummary, settle, type WorkdayHit } from "./stack-scan.ts";
import { toolMentions, toolsInText } from "./stack-tools.ts";
import { findTool, jobBoardLines } from "./agents/account.ts";
import { carriedResearch } from "./research.ts";

// ─── Registry ───

Deno.test("registry: finds a board by domain, by typed name and domain, or by name", () => {
  const equifax = { company: "Equifax", host: "equifax.wd5.myworkdayjobs.com", tenant: "equifax", site: "External" };
  assertEquals(workdayBoardFor("Equifax (equifax.com)"), equifax);
  assertEquals(workdayBoardFor("equifax.com"), equifax);
  assertEquals(workdayBoardFor("https://www.equifax.com/"), equifax);
  assertEquals(workdayBoardFor("Equifax", "careers.equifax.com"), equifax);
  assertEquals(workdayBoardFor("Equifax"), equifax);
  assertEquals(workdayBoardFor("Equifax, Inc."), equifax);
  const depot = workdayBoardFor("The Home Depot (homedepot.com)");
  assertEquals(depot?.host, "homedepot.wd5.myworkdayjobs.com");
  assertEquals(depot?.site, "CareerDepot");
  assertEquals(workdayBoardFor("Home Depot")?.tenant, "homedepot");
  assertEquals(workdayBoardFor("The Home Depot", "homedepot.com")?.tenant, "homedepot");
});

Deno.test("registry: tenants that don't match the company's name", () => {
  assertEquals(workdayBoardFor("Global Payments (globalpayments.com)")?.tenant, "tsys");
  assertEquals(workdayBoardFor("Bank of America")?.tenant, "ghr");
  assertEquals(workdayBoardFor("Floor and Decor")?.tenant, "flooranddecoroutlets");
  assertEquals(workdayBoardFor("Floor & Decor (flooranddecor.com)")?.tenant, "flooranddecoroutlets");
  assertEquals(workdayBoardFor("The Coca-Cola Company")?.tenant, "coke");
  assertEquals(workdayBoardFor("Coca-Cola (coca-colacompany.com)")?.tenant, "coke");
  assertEquals(workdayBoardFor("Lowes")?.tenant, "lowes");
});

Deno.test("registry: unknown companies and unknown domains miss", () => {
  assertEquals(workdayBoardFor("Chime (chime.com)"), undefined);
  assertEquals(workdayBoardFor("acme.com"), undefined);
  assertEquals(workdayBoardFor("Depot"), undefined);
  // A domain that isn't the board's doesn't fall back to a same-name match.
  assertEquals(workdayBoardFor("notequifax.com"), undefined);
});

Deno.test("registry: every board is a Workday host with a tenant and a site", () => {
  assert(WORKDAY_BOARDS.length >= 20);
  for (const b of WORKDAY_BOARDS) {
    assertMatch(b.host, /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/);
    assertEquals(b.host.split(".")[0], b.tenant);
    assertMatch(b.site, /^[A-Za-z0-9_-]+$/);
  }
});

// ─── Everyday words ───

const names = (text: string) => toolsInText(text).map((t) => t.tool.name);

Deno.test("Six Sigma never counts as Sigma, the BI tool", () => {
  for (
    const text of [
      "Lean Six Sigma Green Belt preferred.",
      "Experience with Six Sigma, Looker and Tableau.",
      "Six-Sigma certification.",
      "6 Sigma methodology.",
      "Lean Sigma and kaizen experience.",
      "Reagents from Sigma-Aldrich.",
      "Member of Sigma Xi.",
    ]
  ) assert(!names(text).includes("Sigma Computing"), text);
  assert(names("Dashboards are built in Sigma on top of Snowflake.").includes("Sigma Computing"));
  assert(names("We use Sigma Computing.").includes("Sigma Computing"));
  // "Six Sigma" isn't a BI neighbor either, so it doesn't vouch for "Mode".
  assert(!names("Six Sigma, Mode of operation").includes("Mode"));
  // The model's stack lines are checked with the same rule.
  assertEquals(findTool("Equifax runs Lean Six Sigma programs.", "Sigma"), -1);
  assert(findTool("Equifax builds dashboards in Sigma.", "Sigma") >= 0);
});

Deno.test("omnichannel never counts as Omni", () => {
  for (
    const text of [
      "Our omnichannel strategy spans stores and online.",
      "Omnichannel analytics with Tableau.",
      "Lead omni-channel reporting in Looker.",
      "Tableau and Omni-Channel dashboards.",
      "Looker, Omni Channel experience.",
      "Omni-channel, Looker and Tableau.",
    ]
  ) assert(!names(text).includes("Omni"), text);
  assert(names("BI tools: Looker, Omni and Tableau.").includes("Omni"));
  assert(names("We moved to Omni Analytics.").includes("Omni"));
  assertEquals(findTool("The Home Depot's omni-channel experience.", "Omni"), -1);
  assertEquals(findTool("The Home Depot's Omni Channel team.", "Omni"), -1);
  assert(findTool("The Home Depot uses Omni for BI.", "Omni") >= 0);
});

// ─── Picking which postings to read ───

const hit = (title: string, toolHits: number, order: number): WorkdayHit => ({ title, path: `/job/X/${order}`, toolHits, order });

Deno.test("pickWorkdayPosts: tool-search hits first, data titles before engineering, two copies of a title at most", () => {
  const picked = pickWorkdayPosts([
    hit("Store Associate", 0, 0),
    hit("Software Engineer", 1, 1),
    hit("Data Engineer", 1, 2),
    hit("Data Analyst", 0, 3),
    hit("Data Engineer", 2, 4),
    hit("Data Engineer", 1, 5),
    hit("Marketing Manager", 3, 6),
  ], 5);
  assertEquals(picked.map((h) => h.order), [4, 2, 1, 6, 3]);
});

Deno.test("settle: a straggler doesn't hold up the round", async () => {
  const t0 = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise((r) => (timer = setTimeout(r, 5000)));
  await settle([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3), slow], Date.now() + 8000, 100);
  clearTimeout(timer);
  assert(Date.now() - t0 < 1000);
});

// ─── The reader, with fetch stubbed ───

const HOST = "https://equifax.wd5.myworkdayjobs.com";
const API = `${HOST}/wday/cxs/equifax/External`;

const posting = (title: string, path: string, location = "USA - Atlanta") => ({ title, externalPath: path, locationsText: location, postedOn: "Posted Today" });
const A = posting("Data Engineer", "/job/USA-Atlanta/Data-Engineer_J1");
const B = posting("Analytics Product Manager", "/job/USA-Alpharetta/Analytics-Product-Manager_J2", "2 Locations");
const C = posting("Continuous Improvement Engineer", "/job/USA-Atlanta/CI-Engineer_J3");
const D = posting("Marketing Manager", "/job/USA-Atlanta/Marketing-Manager_J4");
const E = posting("Sales Associate", "/job/USA-Atlanta/Sales-Associate_J5");

// Search totals are loose (a word anywhere, stemmed); only the posting text counts.
const SEARCHES: Record<string, { total: number; jobPostings: unknown[] }> = {
  "": { total: 229, jobPostings: [E] },
  Snowflake: { total: 40, jobPostings: [A, B] },
  Looker: { total: 12, jobPostings: [B] },
  Redshift: { total: 3, jobPostings: [E] },
  "data engineer": { total: 86, jobPostings: [A, C] },
  analytics: { total: 51, jobPostings: [D, B] },
};

const DETAILS: Record<string, Record<string, unknown>> = {
  [A.externalPath]: {
    title: "Data Engineer",
    location: "USA - Atlanta",
    externalUrl: `${HOST}/External${A.externalPath}`,
    jobDescription:
      "<p>Our stack: Snowflake, dbt and Looker.</p><ul><li>Experience with BigQuery, Redshift, or Databricks.</li></ul><p><b>Preferred Qualifications</b></p><ul><li>Tableau dashboards.</li></ul>",
  },
  [B.externalPath]: {
    title: "Analytics Product Manager",
    jobDescription: "<p>Ship customer-facing dashboards built in Looker.</p><p>Experience with Power BI is a plus.</p>",
  },
  [C.externalPath]: {
    title: "Continuous Improvement Engineer",
    externalUrl: `${HOST}/External${C.externalPath}`,
    jobDescription: "<p>Lean Six Sigma Black Belt required.</p><p>Lead Six Sigma projects across the network.</p>",
  },
  [D.externalPath]: {
    title: "Marketing Manager",
    externalUrl: `${HOST}/External${D.externalPath}`,
    jobDescription: "<p>Own our omnichannel and omni-channel campaigns.</p><p>Report weekly results in Tableau.</p>",
  },
  [E.externalPath]: {
    title: "Sales Associate",
    externalUrl: `${HOST}/External${E.externalPath}`,
    jobDescription: "<p>Help customers in store. A great team culture.</p>",
  },
};

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

/** Workday answers from the fixtures; every other board says 404. `hang` paths wait until aborted. */
function stubFetch(hang: string[] = [], calls: string[] = []) {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    // Like some live tenants: a 500 for the runtime's default "Accept-Language: *".
    if (url.startsWith(API) && new Headers(init?.headers).get("accept-language") !== "en-US") return new Response("{}", { status: 500 });
    if (url === `${API}/jobs` && init?.method === "POST") {
      const { searchText } = JSON.parse(String(init.body));
      return json(SEARCHES[searchText] ?? { total: 0, jobPostings: [] });
    }
    if (url.startsWith(`${API}/job/`)) {
      const path = url.slice(API.length);
      if (hang.includes(path)) {
        return await new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      }
      return DETAILS[path] ? json({ jobPostingInfo: DETAILS[path], hiringOrganization: { name: "Equifax Inc." } }) : new Response("{}", { status: 404 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

async function withFetch<T>(stub: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch;
  globalThis.fetch = stub;
  try {
    return await fn();
  } finally {
    globalThis.fetch = real;
  }
}

Deno.test("readWorkday: searches, then posting details, with the public page as each post's URL", async () => {
  const calls: string[] = [];
  const board = await withFetch(stubFetch([], calls), () => readWorkday(workdayBoardFor("equifax.com")!, new AbortController().signal, Date.now() + 8000));
  assert(board);
  assertEquals(board.ats, "workday");
  assertEquals(board.url, `${HOST}/External`);
  assertEquals(board.name, "Equifax");
  assertEquals(board.total, 229);
  assertEquals(board.posts.length, 5);
  const byTitle = Object.fromEntries(board.posts.map((p) => [p.title, p]));
  assertEquals(byTitle["Data Engineer"].url, `${HOST}/External${A.externalPath}`);
  // No externalUrl: the board's own page for the posting.
  assertEquals(byTitle["Analytics Product Manager"].url, `${HOST}/External${B.externalPath}`);
  assertEquals(byTitle["Analytics Product Manager"].location, "2 Locations");
  // HTML is stripped to text, list items kept apart.
  assertMatch(byTitle["Data Engineer"].text, /^Our stack: Snowflake, dbt and Looker\.\n• Experience with BigQuery/);
  // One unfiltered search plus each search term, then one detail per unique posting.
  assertEquals(calls.filter((c) => c.startsWith("POST")).length, 12);
  assertEquals(calls.filter((c) => c.startsWith("GET")).length, 5);
});

Deno.test("scanJobBoards: a Workday company's posts flow into the scan, firm vs option, noise discounted", async () => {
  const scan = await withFetch(stubFetch(), () => scanJobBoards("Equifax", undefined, "equifax.com"));
  assertEquals(scan.found, true);
  assertEquals(scan.ats, "workday");
  assertEquals(scan.board_url, `${HOST}/External`);
  assertEquals(scan.company_name, "Equifax");
  assertEquals(scan.total_jobs, 229);
  assertEquals(scan.scanned_jobs, 5);
  assertEquals(scan.tried[0], "workday:equifax/External");
  const tools = Object.fromEntries(scan.tools.map((t) => [t.tool, [t.firm, t.posts]]));
  assertEquals(tools["Snowflake"], [1, 1]);
  assertEquals(tools["dbt"], [1, 1]);
  assertEquals(tools["Looker"], [2, 2]);
  // Options and a nice-to-have: named, never firm.
  assertEquals(tools["BigQuery"], [0, 1]);
  assertEquals(tools["Amazon Redshift"], [0, 1]); // the Redshift search surfaced a post that never names it
  assertEquals(tools["Databricks"], [0, 1]);
  assertEquals(tools["Power BI"], [0, 1]);
  // Hedged under "Preferred Qualifications" in one post, plain in another.
  assertEquals(tools["Tableau"], [1, 2]);
  assertEquals(tools["Customer-facing analytics"], [1, 1]);
  assertEquals(tools["Sigma Computing"], undefined);
  assertEquals(tools["Omni"], undefined);
  const pm = scan.posts.find((p) => p.title === "Analytics Product Manager");
  assertEquals(pm?.embedded_role, true);

  const sources = scanSources(scan);
  assert(sources.length > 0);
  for (const s of sources) {
    assertEquals(s.via, "workday");
    assertMatch(s.title, / at Equifax \(Workday job post\)$/);
    assert(s.url.startsWith(`${HOST}/External/job/`));
  }
  assertEquals(scanSummary(scan).ats, "workday");
});

Deno.test("scanJobBoards: a slow posting is left out instead of holding up the scan", async () => {
  const t0 = Date.now();
  const scan = await withFetch(stubFetch([A.externalPath]), () => scanJobBoards("Equifax (equifax.com)", undefined, "equifax.com"));
  assert(Date.now() - t0 < 3000, `took ${Date.now() - t0}ms`);
  assertEquals(scan.ats, "workday");
  assertEquals(scan.scanned_jobs, 4);
  assert(!scan.posts.some((p) => p.title === "Data Engineer"));
});

Deno.test("scanJobBoards: with a Greenhouse board too, the board whose posts name more tools wins", async () => {
  const greenhouse = (posts: { title: string; content: string }[]) =>
    (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "https://boards-api.greenhouse.io/v1/boards/equifax") return json({ name: "Equifax" });
      if (url === "https://boards-api.greenhouse.io/v1/boards/equifax/jobs?content=true") {
        return json({
          jobs: posts.map((p, i) => ({ title: p.title, absolute_url: `https://job-boards.greenhouse.io/equifax/jobs/${i}`, content: `${p.content} Equifax is hiring.` })),
        });
      }
      return stubFetch()(input, init);
    }) as typeof fetch;
  const thin = await withFetch(greenhouse([{ title: "Data Analyst", content: "We use Snowflake." }]), () => scanJobBoards("Equifax", undefined, "equifax.com"));
  assertEquals(thin.ats, "workday");
  const rich = await withFetch(
    greenhouse(Array.from({ length: 6 }, (_, i) => ({ title: `Data Engineer ${i}`, content: "We use Snowflake and dbt." }))),
    () => scanJobBoards("Equifax", undefined, "equifax.com"),
  );
  assertEquals(rich.ats, "greenhouse");
});

Deno.test("scanJobBoards: no registry entry, no Workday requests", async () => {
  const calls: string[] = [];
  const scan = await withFetch(stubFetch([], calls), () => scanJobBoards("Northwind Pottery", 2000));
  assertEquals(scan.found, false);
  assert(!calls.some((c) => c.includes("myworkdayjobs.com")));
  assert(!scan.tried.some((t) => t.startsWith("workday:")));
});

// ─── Downstream ───

Deno.test("research carried back from the client keeps Workday posts and the Workday scan", () => {
  const carried = carriedResearch({
    provider: "jobboards",
    query: "Equifax",
    fetched_at: "2026-10-07T00:00:00Z",
    sources: [
      { id: 1, title: "Data Engineer at Equifax (Workday job post)", url: `${HOST}/External${A.externalPath}`, snippet: "names Snowflake", kind: "jobs", via: "workday" },
      { id: 2, title: "Elsewhere", url: "https://example.com/x", snippet: "", kind: "jobs", via: "monster" },
    ],
    scan: { found: true, ats: "workday", board_url: `${HOST}/External`, company_name: "Equifax", total_jobs: 229, scanned_jobs: 16, tools: [], ms: 2500 },
  });
  assertEquals(carried?.research.sources[0].via, "workday");
  assertEquals(carried?.research.sources[1].via, undefined);
  assertEquals(carried?.research.scan?.ats, "workday");
  assertEquals(carried?.research.scan?.found, true);
  assertMatch(carried!.promptBlock, /\(jobs, workday job post\) Data Engineer at Equifax/);
});

Deno.test("stack lines from Workday posts say how many roles were read", () => {
  const scan = {
    found: true,
    ats: "workday" as const,
    total_jobs: 229,
    scanned_jobs: 16,
    tools: [{ tool: "Snowflake", category: "Warehouse" as const, posts: 3, firm: 2 }],
    ms: 2000,
  };
  const [line] = jobBoardLines([{ id: 1, text: "Our stack: Snowflake." }], scan);
  assertEquals(line.status, "Confirmed");
  assertEquals(line.description, "Named in 3 of the 16 data and engineering roles read on its Workday board.");
});
