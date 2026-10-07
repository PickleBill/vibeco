import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { AccountBrief, MotionLabel } from "@/components/account/AccountViews";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import type { Segment, SellerConfig, TerritorySegment } from "@/lib/sellers";

// Saved runs resolve through the shared-report RPC; the tests answer it from `runs`.
const runs: Record<string, SavedReport> = {};
const rpc = vi.fn(async (_fn: string, args: { _report_id: string }) => ({ data: runs[args._report_id] ?? null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (fn: string, args: { _report_id: string }) => rpc(fn, args) } }));

import { omniStatus, toRow, type TerritoryRow } from "@/components/territory/model";
import { AccountSwitcher, SELECT_AFTER } from "@/components/territory/AccountSwitcher";
import { diffRuns } from "@/components/territory/radar/diff";
import { classifyTrigger, freshestTrigger, redactPeople, sourceDay } from "@/components/territory/radar/evidence";
import { BLIP_GAP, placeBlips, radiusFor, toRadarAccount } from "@/components/territory/radar/model";
import { fingerprintOf, rankLookalikes, scoreLookalike, storyLine } from "@/components/territory/lookalikes/model";
import { RadarModule } from "@/components/territory/modules/RadarModule";
import { LookalikesModule } from "@/components/territory/modules/LookalikesModule";

const NOW = new Date(Date.UTC(2026, 9, 7)); // Oct 7, 2026

type Line = [category: string, tool: string, status: string, sources?: number[]];

/** A small saved run: only what the radar and lookalikes read. */
function run(
  id: string,
  company: string,
  o: {
    motion?: MotionLabel;
    fit?: string;
    stack?: Line[];
    whyNow?: string;
    sources?: { id: number; date?: string; title?: string }[];
    embedded?: boolean;
    onList?: boolean;
    created?: string;
    question?: string;
  } = {},
): SavedReport {
  const brief: AccountBrief = {
    lens: "account",
    company,
    research: {
      provider: "test",
      sources: (o.sources ?? [{ id: 1 }, { id: 2 }, { id: 3 }]).map((s) => ({ id: s.id, title: s.title ?? `Source ${s.id}`, url: `https://example.com/${id}/${s.id}`, snippet: "", date: s.date })),
    } as AccountBrief["research"],
    core_features: (o.stack ?? []).map(([name, tool, status, sources = [1]]) => ({ name, tool, status, sources, description: "" })),
    revenue_model: o.whyNow ?? "",
    fit: { grade: o.fit ?? "B", motion: o.motion ?? "Internal", reason: "A reason [1]." },
    motion: {
      label: o.motion ?? "Internal",
      internal: { sources: [1], evidence: [{ source: 1, signal: "Snowflake", quote: "Warehouse: Snowflake" }], clock: "", buyer: "", question: o.question ?? "Who owns the warehouse?" },
      embedded: o.embedded
        ? { sources: [2], evidence: [{ source: 2, signal: "customer dashboards", quote: "customer-facing dashboards" }], clock: "", buyer: "", question: "Who builds the dashboards?" }
        : { sources: [], evidence: [], clock: "", buyer: "", question: "" },
    },
    customer_list: { on_list: !!o.onList, sentence: "" },
    start_with: { role: "Head of Data (or the analytics lead)" },
    discovery_questions: ["What would you change first?"],
  };
  return { id, idea: company, brief, lovable_prompt: null, auto_analysis: null, created_at: o.created ?? "2026-10-06T21:00:00Z" };
}

const rowOf = (r: SavedReport, previousReportId?: string): TerritoryRow => toRow({ company: r.idea, reportId: r.id, previousReportId }, r, NOW);

// ─── Evidence ───

describe("source dates and triggers", () => {
  it("turns a search result's relative date into a day, counted from the run", () => {
    expect(sourceDay("6 days ago", "2026-10-06T21:02:41Z")).toBe("2026-09-30");
    expect(sourceDay("a month ago", "2026-10-06T21:02:41Z")).toBe("2026-09-06");
    expect(sourceDay("2026-09-02", "2026-10-06T21:02:41Z")).toBe("2026-09-02");
    expect(sourceDay("Sep 30, 2026", "2026-10-06T21:02:41Z")).toBe("2026-09-30");
    expect(sourceDay(undefined, "2026-10-06T21:02:41Z")).toBeUndefined();
    expect(sourceDay("recently", "2026-10-06T21:02:41Z")).toBeUndefined();
  });

  it("dates the freshest trigger to the day when a cited source has the day", () => {
    const r = run("t1", "Relay (relaypro.com)", {
      whyNow: "2026-09: Raised $36 million led by a strategic investor [3].\n2026-10 (page last updated): Blog post [6].\nDate not found: Hiring.",
      sources: [{ id: 3, date: "6 days ago" }, { id: 6 }],
      created: "2026-10-06T21:02:41Z",
    });
    const t = freshestTrigger(rowOf(r), NOW);
    expect(t).toMatchObject({ date: "2026-09-30", days: 7, sources: [3], kind: "funding" });
  });

  it("classifies why-now lines by kind", () => {
    expect(classifyTrigger("Relay raised $36 million led by International Paper [3].")).toBe("funding");
    expect(classifyTrigger("Corpay and TPG completed take-private acquisition of AvidXchange for $10/share, ~$2.2B valuation [4].")).toBe("acquisition");
    expect(classifyTrigger("Job post for NetSuite Application Developer open, calling for Snowflake pipeline work [1].")).toBe("hiring");
    expect(classifyTrigger("Guitar Center posts Staff Data Analyst role listing Omni as a current BI platform [2].")).toBe("hiring");
    expect(classifyTrigger("Acme names new Chief Data Officer [2].")).toBe("leadership");
    expect(classifyTrigger("Launched a customer analytics portal [1].")).toBe("launch");
    expect(classifyTrigger("Q2 results show revenue of $220M, up 22% YoY [8].")).toBe("other");
    expect(classifyTrigger("Company cut several directors and VPs amid broader layoffs reportedly tied to IPO prep [6].")).toBe("other");
    expect(classifyTrigger("")).toBe("none");
  });
});

describe("redactPeople", () => {
  const people = [
    { name: "Jane Roe", role: "CEO" },
    { name: "Sam Poe", role: "Founder and former CEO, now board advisor" },
    { name: "Ada Low", role: "VP of Data" },
  ];
  it("shows roles, never names", () => {
    expect(redactPeople("New CEO Jane Roe appointed, replacing founder Sam Poe, who moves to an advisory role [5].", people)).toBe(
      "New CEO appointed, replacing founder, who moves to an advisory role [5].",
    );
    expect(redactPeople("Ada Low led the migration. Has the vision Ada Low described been built?", people)).toBe(
      "The VP of Data led the migration. Has the vision the VP of Data described been built?",
    );
    expect(redactPeople("Ada Low's team owns Looker.", people)).toBe("The VP of Data's team owns Looker.");
    expect(redactPeople("No names here.", undefined)).toBe("No names here.");
  });
});

// ─── Diffs ───

describe("diffRuns", () => {
  const base = { stack: [["Warehouse", "Snowflake", "Confirmed"], ["BI tools", "Tableau", "Inferred", [2]]] as Line[], whyNow: "2026-08: Raised a Series B [2]." };

  it("finds nothing between two runs that say the same thing", () => {
    expect(diffRuns(run("a", "Acme", base), run("b", "Acme", { ...base, whyNow: "2026-08: Acme raised its Series B round [2]." }))).toEqual([]);
  });

  it("counts a tool newly Confirmed or newly Former, with the new run's sources", () => {
    const next = run("b", "Acme", {
      ...base,
      stack: [["Warehouse", "Snowflake (Data Cloud)", "Confirmed"], ["BI tools", "Tableau", "Former", [3]], ["BI tools", "Looker", "Confirmed", [3]]],
    });
    expect(diffRuns(run("a", "Acme", base), next)).toEqual([
      { kind: "stack", field: "BI tools · Tableau", before: "Inferred", after: "Former", sources: [3] },
      { kind: "stack", field: "BI tools · Looker", before: "Not found", after: "Confirmed", sources: [3] },
    ]);
  });

  it("ignores tools that are only inferred, or simply not mentioned this time", () => {
    const next = run("b", "Acme", { ...base, stack: [["BI tools", "Tableau", "Inferred", [2]], ["AI", "Claude", "Inferred", [1]]] });
    expect(diffRuns(run("a", "Acme", base), next)).toEqual([]);
  });

  it("counts a new dated, cited why-now event; not undated or uncited ones", () => {
    const next = run("b", "Acme", { ...base, whyNow: "2026-10: Named a new VP of Data [3].\n2026-08: Raised a Series B [2].\nDate not found: Opened an office [1].\n2026-09: Rumored layoffs." });
    expect(diffRuns(run("a", "Acme", base), next)).toEqual([{ kind: "trigger", field: "Why now", after: "2026-10: Named a new VP of Data.", sources: [3] }]);
  });

  it("counts a motion change a source backs, and a fit change", () => {
    const next = run("b", "Acme", { ...base, motion: "Both", embedded: true, fit: "A" });
    expect(diffRuns(run("a", "Acme", base), next)).toEqual([
      { kind: "motion", field: "Motion", before: "Internal", after: "Both", sources: [1, 2] },
      { kind: "fit", field: "Fit", before: "B", after: "A", sources: [1] },
    ]);
    expect(diffRuns(run("a", "Acme", base), run("c", "Acme", { ...base, motion: "Unclear" }))).toEqual([]);
  });
});

// ─── Radar geometry ───

describe("radar placement", () => {
  it("puts fresher triggers closer to the centre and each motion in its own sector", () => {
    const fresh = toRadarAccount(rowOf(run("f", "Fresh", { whyNow: "2026-10-01: Raised money [1]." })), [], NOW);
    const old = toRadarAccount(rowOf(run("o", "Old", { whyNow: "2025-10: Acquired [1]." })), [], NOW);
    const none = toRadarAccount(rowOf(run("n", "None", { motion: "Embedded" })), [], NOW);
    const blips = placeBlips([fresh, old, none]);
    const dist = (id: string) => {
      const b = blips.find((x) => x.account.row.id === id)!;
      return Math.hypot(b.x - 200, b.y - 200);
    };
    expect(dist("f")).toBeLessThan(dist("o"));
    expect(dist("o")).toBeLessThan(dist("n"));
    expect(fresh.pulse && fresh.fresh).toBe(true);
    expect(old.fresh).toBe(false);
    // Embedded sits in the top-right sector (y above the centre, x right of it).
    const e = blips.find((x) => x.account.row.id === "n")!;
    expect(e.x).toBeGreaterThan(200);
    expect(e.y).toBeLessThan(200);
  });
});

// ─── Lookalikes ───

const gc = run("gc", "Guitar Center (guitarcenter.com)", {
  motion: "Internal",
  onList: true,
  stack: [["Warehouse", "Snowflake", "Confirmed"], ["BI tools", "Omni", "Confirmed"], ["BI tools", "Tableau", "Former"], ["BI tools", "Power BI", "Former"]],
  whyNow: "2026-08: Posted a Staff Data Analyst role [2].",
});
const avid = run("avid", "AvidXchange (avidxchange.com)", {
  motion: "Internal",
  stack: [["Warehouse", "Databricks", "Confirmed"], ["BI tools", "Power BI", "Confirmed", [2]]],
  whyNow: "2025-10: Taken private by a private equity firm [4].",
});
const band = run("band", "Bandwidth (bandwidth.com)", {
  motion: "Both",
  embedded: true,
  stack: [["Warehouse", "Snowflake", "Confirmed"], ["BI tools", "Sigma", "Inferred", [3]]],
  whyNow: "2026-09: Job post for a data engineer open [1].",
});
const onOmni = run("omni", "Already On Omni", { motion: "Internal", stack: [["BI tools", "Omni", "Confirmed"]] });

describe("lookalike scoring", () => {
  const seed = fingerprintOf(rowOf(gc), "Omni", NOW);

  it("reads the fingerprint, leaving the seller's own tool out of the BI story", () => {
    expect(seed.bi).toEqual([]);
    expect(seed.sellerTool?.name).toBe("Omni");
    expect(seed.movedOff.map((t) => t.name)).toEqual(["Tableau", "Power BI"]);
    expect(seed.triggerKind).toBe("hiring");
    expect(seed.onList).toBe(true);
  });

  it("scores each trait with its points: full, half, none, unknown", () => {
    const a = scoreLookalike(seed, fingerprintOf(rowOf(avid), "Omni", NOW));
    expect(Object.fromEntries(a.traits.map((t) => [t.id, [t.match, t.points]]))).toEqual({
      motion: ["full", 30],
      warehouse: ["partial", 10],
      bi: ["full", 20],
      trigger: ["none", 0],
      embedded: ["unknown", 0],
    });
    expect(a.score).toBe(60);
    expect(a.story).toBe("Guitar Center moved off Power BI, which AvidXchange still runs; like Guitar Center, it buys analytics for its own teams.");

    const b = scoreLookalike(seed, fingerprintOf(rowOf(band), "Omni", NOW));
    expect(b.traits.map((t) => t.points)).toEqual([15, 20, 0, 15, 0]);
    expect(b.score).toBe(50);
    expect(b.story).toBe("Like Guitar Center, Bandwidth runs on Snowflake and is hiring (Sep 2026).");
  });

  it("never matches on the seller's own tool or on missing evidence", () => {
    const o = scoreLookalike(seed, fingerprintOf(rowOf(onOmni), "Omni", NOW));
    expect(o.traits.find((t) => t.id === "bi")).toMatchObject({ match: "none", points: 0 });
    expect(o.traits.find((t) => t.id === "warehouse")).toMatchObject({ match: "none", points: 0 });
    const ranked = rankLookalikes(
      seed,
      [gc, avid, band, onOmni].map((r) => fingerprintOf(rowOf(r), "Omni", NOW)),
    );
    expect(ranked.map((l) => l.fp.name)).toEqual(["AvidXchange", "Bandwidth", "Already On Omni"]);
  });

  it("writes a partial story when only partial traits match", () => {
    const relay = fingerprintOf(rowOf(run("relay", "Relay", { motion: "Both", stack: [["BI tools", "Metabase", "Confirmed"]], whyNow: "2026-09-30: Raised $36M [1]." })), "Omni", NOW);
    const s = scoreLookalike(seed, relay);
    expect(s.score).toBe(15 + 10 + 8);
    expect(storyLine(seed, relay, s.traits)).toBe(
      "Partly like Guitar Center: Relay shares the internal side of the motion, has an incumbent BI tool (Metabase) and had a dated trigger in the last 90 days.",
    );
  });
});

// ─── Views ───

const seller: SellerConfig = {
  id: "omni",
  name: "Omni",
  headline: "",
  intro: "",
  examples: [],
  savedRuns: [],
  territory: { name: "Southeast", accounts: [] },
  seeds: [{ name: "Guitar Center", source: "https://example.com/list", reportId: "gc" }],
  footer: "",
};

function territoryOf(reports: SavedReport[]) {
  const rows = reports.map((r) => toRow({ company: r.idea, reportId: r.id }, r));
  return { seller: { ...seller, territory: { name: "Southeast", accounts: rows.map((r) => ({ company: r.typed, reportId: r.id })) } }, territory: { rows, loading: false, missing: [] } };
}

const recent = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

describe("RadarModule", () => {
  it("leads with fresh triggers, opens an account in focus from a blip, and sorts the sheet", async () => {
    const reports = [
      run("r1", "Relay (relaypro.com)", { motion: "Both", fit: "C", whyNow: `${recent(6)}: Raised $36M [1].`, stack: [["BI tools", "Metabase", "Confirmed"]], question: "What powers Operational Insights?" }),
      run("r2", "AvidXchange (avidxchange.com)", { whyNow: "2025-10: Taken private [1].", stack: [["Warehouse", "Databricks", "Confirmed"], ["Warehouse", "Azure SQL Server", "Former"]] }),
    ];
    const { seller: s, territory } = territoryOf(reports);
    render(
      <MemoryRouter>
        <RadarModule seller={s} territory={territory} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 of 2 accounts has a trigger in the last 60 days");
    expect(screen.getByText(/nothing is marked as changed/)).toBeInTheDocument();
    const fresh = screen.getByRole("region", { name: "What's fresh" });
    expect(within(fresh).getByRole("heading", { name: "Relay" })).toBeInTheDocument();
    expect(within(fresh).queryByRole("heading", { name: "AvidXchange" })).toBeNull();
    expect(within(fresh).getByText(/What powers Operational Insights/)).toBeInTheDocument();
    expect(within(fresh).getByRole("link", { name: "Committee" })).toHaveAttribute("href", "/for/omni/committee/r1");

    fireEvent.click(screen.getByRole("button", { name: /^AvidXchange · Internal · Fit B · trigger about \d+ months ago$/ }));
    const panel = screen.getByRole("region", { name: "AvidXchange" });
    expect(within(panel).getByText("Not on Omni's public customer list")).toBeInTheDocument();
    expect(within(panel).getByText("synthetic")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Simulate the committee/ })).toHaveAttribute("href", "/for/omni/committee/r2");

    fireEvent.click(screen.getByRole("tab", { name: /All accounts/ }));
    const header = screen.getByRole("columnheader", { name: /Days since/ });
    expect(header).toHaveAttribute("aria-sort", "ascending");
    const names = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[1].textContent);
    expect(names()[0]).toMatch(/^Relay/);
    fireEvent.click(within(header).getByRole("button"));
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(names()[0]).toMatch(/^AvidXchange/);
  });

  it("lays out a full territory: every account on the radar and in the sheet", () => {
    const motions = ["Internal", "Embedded", "Both", "Unclear"] as const;
    const reports = Array.from({ length: 15 }, (_, i) =>
      run(`s${i}`, `Account ${String.fromCharCode(65 + i)} (a${i}.example)`, { motion: motions[i % 4], fit: "ABC"[i % 3], whyNow: i % 5 === 4 ? "" : `${recent(i * 25)}: Raised money [1].` }),
    );
    const { seller: s, territory } = territoryOf(reports);
    render(
      <MemoryRouter>
        <RadarModule seller={s} territory={territory} />
      </MemoryRouter>,
    );
    const radar = screen.getByRole("region", { name: "Territory radar" });
    expect(within(radar).getAllByRole("button")).toHaveLength(15);
    expect(within(radar).getByText("Unclear")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /All accounts/ }));
    expect(screen.getAllByRole("row")).toHaveLength(16);
  });

  it("shows loading, a missing-run note and the empty territory", () => {
    const { rerender } = render(
      <MemoryRouter>
        <RadarModule seller={{ ...seller, territory: { name: "Southeast", accounts: [{ company: "X", reportId: "x" }] } }} territory={{ rows: [], loading: true, missing: [] }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("progressbar", { name: "Saved runs read" })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <RadarModule seller={seller} territory={{ rows: [], loading: false, missing: ["Bandwidth (bandwidth.com)"] }} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Bandwidth is left off the radar");
    expect(screen.getByRole("link", { name: "Run an account" })).toHaveAttribute("href", "/for/omni");
  });
});

describe("LookalikesModule", () => {
  beforeEach(() => {
    runs.gc = gc;
  });

  it("starts from the first customer with a saved run, ranks the territory, and filters", async () => {
    const { seller: s, territory } = territoryOf([avid, band]);
    render(
      <MemoryRouter initialEntries={["/for/omni/lookalikes"]}>
        <Routes>
          <Route path="/for/:seller/:module?/:reportId?" element={<LookalikesModule seller={s} territory={territory} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts that look like Guitar Center" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guitar Center/ })).toHaveAttribute("aria-pressed", "true");
    const ranked = screen.getByRole("region", { name: "Ranked lookalikes · 2" });
    const cards = within(ranked).getAllByRole("article");
    expect(within(cards[0]).getByText("60")).toBeInTheDocument();
    expect(within(cards[0]).getByText(/which AvidXchange still runs/)).toBeInTheDocument();
    expect(screen.getByText(/A live version would search the web/)).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("group", { name: "Motion" })).getByRole("button", { name: "Embedded" }));
    expect(screen.getByText("No lookalikes match these filters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Drop “Embedded”: 2 matches/ }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("selects a territory account as the seed from the URL", async () => {
    const { seller: s, territory } = territoryOf([avid, band]);
    render(
      <MemoryRouter initialEntries={["/for/omni/lookalikes/band"]}>
        <Routes>
          <Route path="/for/:seller/:module?/:reportId?" element={<LookalikesModule seller={s} territory={territory} reportId="band" />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Accounts that look like Bandwidth"));
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
});

// ─── Segments and Omni at the account ───

describe("omniStatus", () => {
  it("reads Omni at the account from the run's evidence", () => {
    expect(omniStatus(run("a", "Acme", { onList: true }).brief)).toBe("Confirmed");
    expect(omniStatus(run("b", "Acme", { stack: [["BI tools", "Omni", "Confirmed"]] }).brief)).toBe("Likely");
    expect(omniStatus(run("c", "Acme", { stack: [["BI tools", "Omni Analytics", "Inferred"]] }).brief)).toBe("Likely");
    expect(omniStatus(run("d", "Acme", { stack: [["Marketing", "Omnichannel personalization", "Confirmed"]] }).brief)).toBe("None found");
    expect(omniStatus(run("e", "Acme", { stack: [["BI tools", "Omni", "Former"]] }).brief)).toBe("None found");
    expect(omniStatus(run("f", "Acme").brief)).toBe("None found");
    expect(omniStatus(undefined)).toBe("None found");
  });

  it("passes the segment and the Omni status through toRow", () => {
    const r = run("k", "Kaseya (kaseya.com)", { stack: [["BI tools", "Omni", "Confirmed"]] });
    expect(toRow({ company: r.idea, reportId: r.id, segment: "Strategic" }, r, NOW)).toMatchObject({ segment: "Strategic", omni: "Likely", name: "Kaseya" });
    expect(toRow({ company: r.idea, reportId: r.id }, r, NOW).segment).toBeUndefined();
  });
});

describe("radar placement in a big territory", () => {
  it("keeps 40 blips apart without moving any off its ring", () => {
    const motions = ["Internal", "Embedded", "Both"] as const;
    const accounts = Array.from({ length: 40 }, (_, i) =>
      toRadarAccount(rowOf(run(`b${i}`, `Big ${i}`, { motion: motions[i % 3], whyNow: i % 4 === 3 ? "" : `${recent(5 + ((i * 11) % 200))}: Raised money [1].` })), [], NOW),
    );
    const blips = placeBlips(accounts);
    expect(blips).toHaveLength(40);
    for (const b of blips) expect(Math.hypot(b.x - 200, b.y - 200)).toBeCloseTo(radiusFor(b.account.trigger?.days), 5);
    let closest = Infinity;
    blips.forEach((a, i) => blips.slice(i + 1).forEach((b) => (closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y)))));
    expect(closest).toBeGreaterThanOrEqual(BLIP_GAP);
  });
});

const SEGMENTS: TerritorySegment[] = [
  { id: "Strategic", label: "Strategic", note: "5,000+ employees" },
  { id: "Enterprise", label: "Enterprise", note: "Under 5,000" },
];

/** A territory split into segments: `segs[i]` for `reports[i]`. */
function segmentedTerritory(reports: SavedReport[], segs: Segment[]) {
  const accounts = reports.map((r, i) => ({ company: r.idea, reportId: r.id, segment: segs[i] }));
  const rows = reports.map((r, i) => toRow(accounts[i], r));
  return { seller: { ...seller, territory: { name: "Southeast", segments: SEGMENTS, accounts } }, territory: { rows, loading: false, missing: [] } };
}

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

describe("RadarModule segments", () => {
  const reports = [
    run("st1", "Big Bank (bigbank.example)", { whyNow: `${recent(4)}: Named a new Chief Data Officer [1].`, onList: true }),
    run("st2", "Big Store (bigstore.example)", { motion: "Embedded", stack: [["BI tools", "Omni", "Confirmed", [2]]] }),
    run("en1", "Small Co (smallco.example)", { whyNow: `${recent(10)}: Raised money [1].` }),
    run("en2", "Mid Co (midco.example)", { motion: "Both", whyNow: "2025-06: Launched a product [1]." }),
    run("en3", "Other Co (otherco.example)"),
  ];
  const segs: Segment[] = ["Strategic", "Strategic", "Enterprise", "Enterprise", "Enterprise"];

  it("reads the segment from the URL and narrows every count to it", () => {
    const { seller: s, territory } = segmentedTerritory(reports, segs);
    render(
      <MemoryRouter initialEntries={["/for/omni?segment=strategic"]}>
        <RadarModule seller={s} territory={territory} />
        <Where />
      </MemoryRouter>,
    );
    const group = screen.getByRole("radiogroup", { name: "Segment" });
    expect(within(group).getByRole("radio", { name: /Strategic/ })).toHaveAttribute("aria-checked", "true");
    expect(within(group).getByRole("radio", { name: /^All/ })).toHaveTextContent("5");
    expect(within(group).getByRole("radio", { name: /Enterprise/ })).toHaveTextContent("3");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 of 2 Strategic accounts has a trigger in the last 60 days");
    expect(within(screen.getByRole("region", { name: "Territory radar" })).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: /All accounts/ })).toHaveTextContent("2");

    // Omni at the account: on the blip's name and in the radar's legend.
    expect(screen.getByRole("button", { name: /^Big Store · Strategic · Embedded · .* · Omni named in its job posts$/ })).toBeInTheDocument();
    expect(screen.getByText("On Omni's public customer list")).toBeInTheDocument();

    fireEvent.click(within(group).getByRole("radio", { name: /Enterprise/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/for/omni?segment=enterprise");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 of 3 Enterprise accounts has a trigger in the last 60 days");
    expect(within(screen.getByRole("region", { name: "Territory radar" })).getAllByRole("button")).toHaveLength(3);

    fireEvent.keyDown(within(group).getByRole("radio", { name: /Enterprise/ }), { key: "Home" });
    expect(screen.getByTestId("where").textContent).toBe("/for/omni");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("2 of 5 accounts have a trigger in the last 60 days");
  });

  it("adds sortable Segment and Omni columns to the sheet", () => {
    const { seller: s, territory } = segmentedTerritory(reports, segs);
    render(
      <MemoryRouter>
        <RadarModule seller={s} territory={territory} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("tab", { name: /All accounts/ }));
    fireEvent.click(within(screen.getByRole("columnheader", { name: /Omni/ })).getByRole("button"));
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getAllByRole("cell")[1]).toHaveTextContent(/^Big Bank/);
    expect(rows[0]).toHaveTextContent("On Omni's public customer list");
    expect(within(rows[1]).getAllByRole("cell")[1]).toHaveTextContent(/^Big Store/);
    expect(rows[2]).toHaveTextContent("Not on Omni's public customer list");
    fireEvent.click(within(screen.getByRole("columnheader", { name: /Segment/ })).getByRole("button"));
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => within(r).getAllByRole("cell")[2].textContent),
    ).toEqual(["Strategic", "Strategic", "Enterprise", "Enterprise", "Enterprise"]);
  });

  it("says so when a segment has no runs yet", () => {
    const { seller: s, territory } = segmentedTerritory(reports.slice(2), segs.slice(2));
    render(
      <MemoryRouter initialEntries={["/for/omni?segment=strategic"]}>
        <RadarModule seller={s} territory={territory} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("No Strategic accounts on the radar yet");
    fireEvent.click(screen.getByRole("button", { name: "Show all 3 accounts" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("1 of 3 accounts has a trigger in the last 60 days");
  });
});

describe("AccountSwitcher", () => {
  const rowsOf = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const name = `Account ${String.fromCharCode(65 + i)}`;
      return toRow({ company: name, reportId: `a${i}`, segment: i < 3 ? "Strategic" : "Enterprise" }, run(`a${i}`, name, { fit: "B" }));
    });

  it("is a row of chips for a small territory", () => {
    render(
      <MemoryRouter>
        <AccountSwitcher rows={rowsOf(SELECT_AFTER)} activeId="a1" hrefFor={(id) => `/x/${id}`} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("radio", { name: "Account B" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("becomes a select grouped by segment past the threshold", () => {
    render(
      <MemoryRouter>
        <AccountSwitcher rows={rowsOf(12)} activeId="a4" hrefFor={(id) => `/for/omni/committee/${id}`} segments={SEGMENTS} />
        <Where />
      </MemoryRouter>,
    );
    const select = screen.getByRole("combobox", { name: "Account" });
    expect(select).toHaveValue("a4");
    const groups = within(select).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("label"))).toEqual(["Strategic · 5,000+ employees", "Enterprise · Under 5,000"]);
    expect(within(groups[0]).getAllByRole("option")).toHaveLength(3);
    expect(within(groups[1]).getByRole("option", { name: "Account E · Internal · Fit B" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "a7" } });
    expect(screen.getByTestId("where")).toHaveTextContent("/for/omni/committee/a7");
  });
});

describe("LookalikesModule seeds and segments", () => {
  beforeEach(() => {
    runs.gc = gc;
  });

  it("seeds from accounts whose run names Omni, and filters results by segment", async () => {
    const named = run("named", "Named Co (named.example)", { motion: "Internal", stack: [["Warehouse", "Snowflake", "Confirmed"], ["BI tools", "Omni", "Confirmed"]] });
    const { seller: s, territory } = segmentedTerritory([avid, band, named], ["Strategic", "Enterprise", "Enterprise"]);
    render(
      <MemoryRouter initialEntries={["/for/omni/lookalikes"]}>
        <Routes>
          <Route path="/for/:seller/:module?/:reportId?" element={<LookalikesModule seller={s} territory={territory} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts that look like Guitar Center" })).toBeInTheDocument();
    const seeds = screen.getByRole("group", { name: "Start from a customer" });
    expect(within(seeds).getByRole("button", { name: /^Named Co\s*Omni named in its job posts$/ })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);

    const seg = screen.getByRole("group", { name: "Segment" });
    fireEvent.click(within(seg).getByRole("button", { name: /Strategic/ }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Ranked lookalikes · 1" })).toHaveTextContent("AvidXchange");
    fireEvent.click(within(seg).getByRole("button", { name: /Enterprise/ }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
