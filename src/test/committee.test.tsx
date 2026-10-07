import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { SavedReport } from "@/components/account/explorer/savedRuns";

// The Supabase client: function calls and the shared-report RPC, recorded.
const invoke = vi.fn();
const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    rpc: (...args: unknown[]) => rpc(...args),
  },
}));

import { CommitteeModule } from "@/components/territory/modules/CommitteeModule";
import { toRow } from "@/components/territory/model";
import { clampStance, readCommittee, stancePercent, stanceWord, timeline, stancesAt, whatIfOptions, type CommitteeResult } from "@/components/territory/committee/model";
import { getSeller } from "@/lib/sellers";

const brief: AccountBrief = {
  lens: "account",
  seller: "omni",
  company: "Acme Outfitters",
  research: {
    provider: "firecrawl",
    sources: [
      { id: 1, title: "Data Engineer at Acme Outfitters", url: "https://example.com/job", snippet: "Looker", kind: "jobs", via: "greenhouse" },
      { id: 2, title: "Acme raises $20M", url: "https://example.com/news", snippet: "", kind: "news", date: "2026-09-02" },
    ],
  },
  revenue_model: "2026-09: Raised $20M [2].",
  core_features: [
    { name: "Warehouse", tool: "Snowflake", status: "Confirmed", sources: [1], description: "" },
    { name: "BI tools", tool: "Looker", status: "Confirmed", sources: [1], description: "" },
  ],
  fit: { grade: "B", motion: "Internal", reason: "Hiring, no trigger." },
  motion: {
    label: "Internal",
    internal: { sources: [1], evidence: [], clock: "", buyer: "", question: "" },
    embedded: { sources: [], evidence: [], clock: "", buyer: "", question: "" },
  },
  customer_list: { on_list: false, sentence: "Acme Outfitters is not on Omni's public customer list." },
};

const perspectives = [
  { persona: "champion", headline: "Worth 30 minutes", perspective: "We run Looker [1].", challenge_questions: [{ question: "Who owns the semantic layer?" }] },
  { persona: "skeptic", headline: "Not this year", perspective: "Budget is set [2].", challenge_questions: [{ question: "What does it replace?" }] },
  { persona: "competitor", headline: "Looker is enough", perspective: "", challenge_questions: [] },
  { persona: "customer", headline: "I wait on tickets", perspective: "", challenge_questions: [] },
  { persona: "builder", headline: "Models carry over", perspective: "", challenge_questions: [] },
];

const meeting: CommitteeResult = {
  seats: [
    { seat: "champion", role: "Head of Data", stance_start: 1, stance_end: 2, influence: 3, top_concern: "Looker models drift from finance [1]." },
    { seat: "skeptic", role: "CFO", stance_start: -1, stance_end: -1, influence: 3, top_concern: "The raise [2] is spoken for." },
    { seat: "competitor", role: "Incumbent BI vendor", stance_start: -2, stance_end: -2, influence: 2, top_concern: "Looker already ships." },
    { seat: "customer", role: "Business user", stance_start: 0, stance_end: 1, influence: 1, top_concern: "Every new cut is a ticket." },
    { seat: "builder", role: "Analytics engineer", stance_start: 0, stance_end: 0, influence: 2, top_concern: "Rebuilding models." },
  ],
  rounds: [
    { title: "Opening positions", turns: [{ seat: "champion", says: "We run Looker [1].", stance_after: 1 }, { seat: "skeptic", says: "The raise [2] is spoken for.", stance_after: -1 }] },
    { title: "Evidence lands", turns: [{ seat: "customer", says: "I wait on tickets.", stance_after: 1 }] },
    { title: "The close", turns: [{ seat: "champion", says: "One model for both teams.", stance_after: 2 }] },
  ],
  path_to_yes: [{ step: "Win the Head of Data on one shared model.", seat: "champion", why: "The drift is real [1]." }],
  main_blocker: { seat: "skeptic", why: "No budget event in the sources.", what_would_flip_it: "A pilot scoped to one team." },
  outcome: { label: "Uphill", low: 25, high: 40, summary: "The CFO holds." },
};

// Meetings run in the view are kept for the page's life, so each test uses its own run id.
let ID = "";
let seq = 0;

function report(committee?: CommitteeResult): SavedReport {
  return {
    id: ID,
    idea: "Acme Outfitters (acme.com)",
    brief,
    lovable_prompt: null,
    auto_analysis: { perspectives, ...(committee ? { committee } : {}) } as SavedReport["auto_analysis"],
    created_at: "2026-10-06T21:00:00Z",
  };
}

function renderModule(committee?: CommitteeResult) {
  const seller = getSeller("omni")!;
  const entry = { company: "Acme Outfitters (acme.com)", reportId: ID };
  const scoped = { ...seller, territory: { name: "Southeast", accounts: [entry] } };
  const row = toRow(entry, report(committee));
  return render(
    <MemoryRouter>
      <CommitteeModule seller={scoped} territory={{ rows: [row], loading: false, missing: [] }} />
    </MemoryRouter>,
  );
}

const committeeCalls = () => invoke.mock.calls.filter(([name, opts]) => name === "committee-sim" && !(opts as { body: { ping?: boolean } }).body.ping);

beforeEach(() => {
  ID = `11111111-2222-3333-4444-${String(++seq).padStart(12, "0")}`;
  invoke.mockReset();
  invoke.mockResolvedValue({ data: null, error: null });
  rpc.mockReset();
});

describe("committee view", () => {
  it("renders a stored committee without calling the endpoint", async () => {
    renderModule(meeting);
    expect(screen.getByRole("heading", { name: "Acme Outfitters’ buying room" })).toBeInTheDocument();
    // Before it plays: opening stances and influence are already on the table.
    expect(screen.getByRole("meter", { name: "CFO stance" })).toHaveAttribute("aria-valuenow", "-1");
    fireEvent.click(screen.getByRole("button", { name: /Show all/ }));
    expect(await screen.findByRole("heading", { name: /^Outcome/ })).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /^Outcome/ })).getByText("Uphill")).toBeInTheDocument();
    expect(screen.getByText("Win the Head of Data on one shared model.")).toBeInTheDocument();
    expect(screen.getByText("A pilot scoped to one team.")).toBeInTheDocument();
    expect(screen.getByText(/Synthetic estimate from the simulated meeting, not a forecast/)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Head of Data stance" })).toHaveAttribute("aria-valuenow", "2");
    // Citations become source chips linking to the source.
    expect(screen.getAllByRole("link", { name: /1/ }).some((a) => a.getAttribute("href") === "https://example.com/job")).toBe(true);
    expect(committeeCalls()).toHaveLength(0);
  });

  it("plays the meeting line by line, moving the stance meters", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      renderModule(meeting);
      fireEvent.click(screen.getByRole("button", { name: /Run the meeting/ }));
      const room = within(screen.getByRole("region", { name: "The meeting" }));
      expect(room.getByText("We run Looker")).toBeInTheDocument();
      expect(room.queryByText(/The raise/)).not.toBeInTheDocument();
      expect(screen.getByRole("meter", { name: "Business user stance" })).toHaveAttribute("aria-valuenow", "0");
      act(() => vi.advanceTimersByTime(1400));
      expect(room.getByText(/The raise/)).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1400));
      // Round 2: the business user's line lands and their meter moves.
      expect(room.getByText("I wait on tickets.")).toBeInTheDocument();
      expect(screen.getByRole("meter", { name: "Business user stance" })).toHaveAttribute("aria-valuenow", "1");
      expect(screen.queryByRole("region", { name: /^Outcome/ })).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1400));
      expect(screen.getByRole("region", { name: /^Outcome/ })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs the meeting through the endpoint when the run doesn't have one", async () => {
    invoke.mockImplementation(async (name: string, opts: { body: { ping?: boolean } }) =>
      name === "committee-sim" && !opts.body.ping ? { data: meeting, error: null } : { data: null, error: null },
    );
    renderModule();
    // Before the meeting: the critics' saved headlines keep the room full.
    expect(screen.getAllByText("Not this year").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Run the meeting/ }));
    await waitFor(() => expect(committeeCalls()).toHaveLength(1));
    expect(committeeCalls()[0][1]).toMatchObject({ body: { report_id: ID } });
    expect((committeeCalls()[0][1] as { body: Record<string, unknown> }).body.what_if).toBeUndefined();
    fireEvent.click(await screen.findByRole("button", { name: /Show all/ }));
    expect(await screen.findByText("Win the Head of Data on one shared model.")).toBeInTheDocument();
    expect(screen.getByText("One model for both teams.")).toBeInTheDocument();
  });

  it("re-runs with what-ifs, sends them, and shows the change against the saved meeting", async () => {
    const changed: CommitteeResult = {
      ...meeting,
      seats: meeting.seats.map((s) => (s.seat === "skeptic" ? { ...s, stance_end: 1 } : s)),
      rounds: [...meeting.rounds.slice(0, 2), { title: "The close", turns: [{ seat: "skeptic", says: "With a date, I can budget it.", stance_after: 1 }] }],
      outcome: { label: "Coin flip", low: 40, high: 60, summary: "The CFO comes round." },
    };
    invoke.mockImplementation(async (name: string, opts: { body: { ping?: boolean; what_if?: string[] } }) =>
      name === "committee-sim" && opts.body.what_if ? { data: { ...changed, what_if: opts.body.what_if }, error: null } : { data: null, error: null },
    );
    renderModule(meeting);
    fireEvent.click(screen.getByLabelText("They confirm a Looker renewal date"));
    fireEvent.click(screen.getByRole("button", { name: /Re-run with these/ }));
    await waitFor(() => expect(committeeCalls()).toHaveLength(1));
    expect(committeeCalls()[0][1]).toMatchObject({ body: { report_id: ID, what_if: ["They confirm a Looker renewal date"] } });
    const outcome = await screen.findByRole("region", { name: /Outcome with your what-ifs/ });
    expect(within(outcome).getByText("Coin flip")).toBeInTheDocument();
    expect(within(outcome).getByText(/saved meeting: Uphill, 25–40%/)).toBeInTheDocument();
    // The CFO moved two steps toward yes against the saved meeting.
    expect(screen.getAllByText("+2").length).toBeGreaterThan(0);
    expect(screen.getByRole("meter", { name: "CFO stance" })).toHaveAttribute("aria-valuetext", "Leans yes, was Leans no");
    fireEvent.click(screen.getByRole("button", { name: "Back to the saved meeting" }));
    expect(within(await screen.findByRole("region", { name: /^Outcome$/ })).getByText("Uphill")).toBeInTheDocument();
  });

  it("keeps the critics visible when the endpoint fails, with a retry", async () => {
    invoke.mockImplementation(async (name: string, opts: { body: { ping?: boolean } }) =>
      name === "committee-sim" && !opts.body.ping
        ? { data: null, error: { context: new Response(JSON.stringify({ error: "Requested function was not found" }), { status: 404 }) } }
        : { data: null, error: null },
    );
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: /Run the meeting/ }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/The committee isn’t available right now/)).toBeInTheDocument();
    for (const h of ["Worth 30 minutes", "Not this year", "Looker is enough", "I wait on tickets", "Models carry over"]) expect(screen.getAllByText(h).length).toBeGreaterThan(0);
    fireEvent.click(within(alert).getByRole("button", { name: /Try again/ }));
    await waitFor(() => expect(committeeCalls()).toHaveLength(2));
  });

  it("says when the endpoint is rate-limited", async () => {
    invoke.mockImplementation(async (name: string, opts: { body: { ping?: boolean } }) =>
      name === "committee-sim" && !opts.body.ping ? { data: null, error: { context: new Response("{}", { status: 429 }) } } : { data: null, error: null },
    );
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: /Run the meeting/ }));
    expect(await screen.findByText(/Wait a minute, then try again/)).toBeInTheDocument();
  });

  it("opens on the current account when the URL names none, and points on to run another account", () => {
    const seller = getSeller("omni")!;
    const entry = { company: "Acme Outfitters (acme.com)", reportId: ID };
    // Acme is second in the territory; the session's current account wins over the first.
    const scoped = { ...seller, territory: { name: "Southeast", accounts: [{ company: "Relay (relaypro.com)", reportId: "relay" }, entry] } };
    render(
      <MemoryRouter>
        <CommitteeModule seller={scoped} territory={{ rows: [toRow(entry, report(meeting))], loading: false, missing: [] }} current={ID} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Acme Outfitters’ buying room" })).toBeInTheDocument();
    const next = screen.getByRole("navigation", { name: "Next step" });
    expect(within(next).getByRole("link", { name: "Run another account" })).toHaveAttribute("href", "/for/omni");
  });
});

describe("committee model", () => {
  it("maps stances onto blocks…sponsors", () => {
    expect([-2, -1, 0, 1, 2].map((v) => stanceWord(clampStance(v)))).toEqual(["Blocks", "Leans no", "Neutral", "Leans yes", "Sponsors"]);
    expect([-2, 0, 2].map((v) => stancePercent(clampStance(v)))).toEqual([0, 50, 100]);
    expect(clampStance(5)).toBe(2);
    expect(clampStance(-3.4)).toBe(-2);
    expect(clampStance("1")).toBe(1);
    expect(clampStance(undefined)).toBe(0);
  });

  it("reads a meeting defensively and replays stances line by line", () => {
    expect(readCommittee({ seats: [] })).toBeNull();
    const c = readCommittee({ ...meeting, seats: [...meeting.seats, { seat: "nobody" }], outcome: { ...meeting.outcome, low: 70, high: 120 } })!;
    expect(c.seats.map((s) => s.seat)).toEqual(["champion", "skeptic", "competitor", "customer", "builder"]);
    expect([c.outcome.low, c.outcome.high]).toEqual([70, 100]);
    const steps = timeline(c);
    expect(steps).toHaveLength(4);
    expect(stancesAt(c, steps, 0).champion).toBe(1);
    expect(stancesAt(c, steps, 3).customer).toBe(1);
    expect(stancesAt(c, steps, 4).champion).toBe(2);
  });

  it("builds what-ifs only from what the brief says", () => {
    expect(whatIfOptions(brief).map((w) => w.label)).toEqual(["They confirm a Looker renewal date", "A new data leader joins", "A budget owner for BI is named"]);
    const embedded: AccountBrief = {
      ...brief,
      motion: { ...brief.motion!, label: "Both" },
      core_features: [
        { name: "Warehouse", tool: "Databricks (Lakehouse)", status: "Confirmed", description: "" },
        { name: "Warehouse", tool: "SQL Server", status: "Former", description: "" },
        { name: "BI tools", tool: "Sigma", status: "Inferred", description: "" },
      ],
    };
    expect(whatIfOptions(embedded).map((w) => w.label)).toEqual([
      "They confirm Sigma as their BI tool",
      "A new data leader joins",
      "Their next customer-facing analytics release gets a date",
    ]);
    const internal = { ...embedded, motion: { ...brief.motion!, label: "Internal" as const } };
    expect(whatIfOptions(internal)[2].label).toBe("Their move to Databricks gets a finish date");
    expect(whatIfOptions(internal).every((w) => !/customer list/i.test(w.label))).toBe(true);
  });
});
