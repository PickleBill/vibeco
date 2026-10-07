import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { AccountAnalysis } from "@/components/account/explorer/model";

// The Supabase client: function calls, the shared-report RPC and a realtime channel, all recorded.
const invoke = vi.fn();
const rpc = vi.fn();
let onEvent: ((payload: { new: Record<string, unknown> }) => void) | undefined;
const channel = {
  on: vi.fn((_type: string, _filter: unknown, cb: typeof onEvent) => {
    onEvent = cb;
    return channel;
  }),
  subscribe: vi.fn((cb?: (status: string) => void) => {
    cb?.("SUBSCRIBED");
    return channel;
  }),
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    rpc: (...args: unknown[]) => rpc(...args),
    channel: () => channel,
    removeChannel: vi.fn(),
  },
}));

import { AccountExplorer } from "@/components/account/explorer/AccountExplorer";
import { TerritoryStrip } from "@/components/account/explorer/TerritoryStrip";
import { useAgentBoard } from "@/components/account/explorer/useAgentBoard";
import { asList, criticParagraphs, relabelSeats, seatPeople, whyNowItems } from "@/components/account/explorer/model";

const brief: AccountBrief = {
  lens: "account",
  seller: "omni",
  company: "Acme Outfitters",
  research: {
    provider: "firecrawl",
    sources: [
      { id: 1, title: "Data Engineer at Acme Outfitters", url: "https://example.com/job", snippet: "Snowflake and Looker", kind: "jobs", via: "greenhouse" },
      { id: 2, title: "Acme raises $20M", url: "https://example.com/news", snippet: "", kind: "news", date: "2026-09-02" },
      { id: 3, title: "Another Acme", url: "https://example.com/other", snippet: "", kind: "stack", off_topic: true },
    ],
  },
  account_line: "Acme Outfitters is an outdoor retailer growing its data team [1].",
  revenue_model: "2026-09: Raised $20M [2].\nDate not found: Opened a new store.",
  core_features: [
    { name: "Warehouse", tool: "Snowflake", status: "Confirmed", sources: [1], description: "", evidence: "We run Snowflake." },
    { name: "BI tools", tool: "Tableau", status: "Former", sources: [2], description: "Moved off it." },
    { name: "AI", tool: "", status: "Not found", sources: [], description: "" },
  ],
  start_with: { role: "Head of Data", why: "Owns the stack [1]." },
  discovery_questions: ["Who owns Looker today?"],
  migration_objection: { objection: "We just rolled out Looker.", honest_answer: "Migration takes work." },
  fit: { grade: "B", motion: "Internal", reason: "Hiring, no trigger." },
  motion: {
    label: "Internal",
    internal: { sources: [1], evidence: [{ source: 1, signal: "Snowflake", quote: "Warehouse: Snowflake" }], clock: "A renewal [1]", buyer: "Head of Data [1]", question: "Who renews Looker?" },
    embedded: { sources: [], evidence: [], clock: "", buyer: "", question: "" },
  },
  customer_list: { on_list: false, sentence: "Acme Outfitters is not on Omni's public customer list." },
};

const analysis: AccountAnalysis = {
  perspectives: [
    { persona: "champion", headline: "Worth 30 minutes", perspective: "## Head of Data's Take\n\nWe run Snowflake [1].\n\n## Challenge Questions\n1. dup", challenge_questions: [{ question: "Who owns the semantic layer?", context: "It decides the buyer." }] },
    { persona: "skeptic", headline: "Not this year", perspective: "Budget is set [2].", challenge_questions: [{ question: "What does it replace?", context: "" }] },
  ],
  expansion: { core_insight: "Growing data team [1].", expansions: [{ title: "Start with finance", pitch: "Finance first.", potential: "easier-to-build" }] },
  distillation: { one_feature: "The raise [2].", one_customer: "Head of Data.", one_revenue: "Who owns Looker?", thesis_statement: "Call now.", what_to_cut: "['Pricing', 'Roadmap']" },
  synthesis: { executive_summary: "The Skeptic and the Champion agree it's early.", consensus: ["**Trigger:** the raise [2]."], tensions: [{ topic: "Timing" }], confidence_score: 72, ranked_recommendations: [{ action: "Ask about Looker", rationale: "It's the incumbent" }] },
  timing: { "perspective-champion": 5000, "perspective-skeptic": 4000, expand: 3000, distill: 2000, synthesis: 9000 },
};

function Settled() {
  const { board, settle } = useAgentBoard();
  return (
    <>
      <button onClick={() => settle(analysis)}>settle</button>
      <AccountExplorer company="Acme Outfitters" brief={brief} plan="FIRST-CALL PLAN: Acme" analysis={analysis} board={board} sellerName="Omni" />
    </>
  );
}

beforeEach(() => {
  invoke.mockReset();
  invoke.mockResolvedValue({ data: null, error: null });
  rpc.mockReset();
  onEvent = undefined;
});

/** A desktop-wide screen: the folds marked "wide" start open. */
function wideScreen() {
  const original = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ ...original(q), matches: q.includes("min-width: 1024px") })) as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });
}

describe("account explorer", () => {
  wideScreen();

  it("renders a saved run from stored data, with no agent calls", async () => {
    render(<Settled />);
    act(() => screen.getByText("settle").click());
    expect(screen.getByRole("heading", { name: "Acme Outfitters" })).toBeInTheDocument();
    expect(screen.getByText(/Fit for the internal motion/i)).toBeInTheDocument();
    expect(screen.getByText("Not on Omni's public customer list")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Where they agree")).toBeInTheDocument());
    // Seat names replace the idea-flow persona names; the bold lead is rendered, not shown as markdown.
    expect(screen.getByText(/The CFO and the Head of Data agree/)).toBeInTheDocument();
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    // Only the chat's warm-up call; nothing re-runs the agents.
    expect(invoke.mock.calls.every(([name, opts]) => name === "critic-chat" && (opts as { body: { ping?: boolean } }).body.ping)).toBe(true);
  });

  it("picks a seat and shows its take and the questions it would ask", async () => {
    render(<Settled />);
    expect(screen.getByText("Worth 30 minutes")).toBeInTheDocument();
    expect(screen.getByText("Who owns the semantic layer?")).toBeInTheDocument();
    // The "Challenge Questions" section of the markdown isn't repeated.
    expect(screen.queryByText("1. dup")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^CFO/ }));
    await waitFor(() => expect(screen.getByText("Not this year")).toBeInTheDocument());
    expect(screen.getByText("What does it replace?")).toBeInTheDocument();
  });

  it("answers the critic: reply, grade and follow-up; an error keeps the text", async () => {
    render(<Settled />);
    invoke.mockImplementation(async (_name: string, opts: { body: { ping?: boolean } }) =>
      opts.body.ping ? { data: null, error: null } : { data: { reply: "Show me the numbers [1].", verdict: "partial", follow_up: "Which team first?" }, error: null },
    );
    const box = screen.getByLabelText("Your answer");
    fireEvent.change(box, { target: { value: "We cut report time in half." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByText("Partial")).toBeInTheDocument());
    expect(screen.getByText("Which team first?")).toBeInTheDocument();
    const call = invoke.mock.calls.find(([, o]) => !(o as { body: { ping?: boolean } }).body.ping)!;
    expect((call[1] as { body: { seat: string; question: string } }).body).toMatchObject({ seat: "champion", question: "Who owns the semantic layer?" });

    invoke.mockResolvedValue({ data: null, error: new Error("down") });
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "Second try." } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(screen.getByText(/didn't answer/)).toBeInTheDocument());
    expect((screen.getByLabelText("Your answer") as HTMLTextAreaElement).value).toBe("Second try.");
  });

  it("shows Former and Not found in the stack map, and the full plan in tabs", () => {
    render(<Settled />);
    // MEDDPICC lives in the Committee now, not in the plan.
    const planTabs = within(screen.getByRole("tablist", { name: "The first-call plan" })).getAllByRole("tab");
    expect(planTabs.map((t) => t.textContent)).toEqual(["First call", "Stack", "Why now", "Objection", "Research", "Sources2"]);
    expect(screen.getByRole("button", { name: "Copy plan" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Stack" }));
    expect(screen.getByRole("button", { name: "Tableau" })).toBeInTheDocument();
    expect(screen.getAllByText("Not found").length).toBeGreaterThan(0);
  });
});

describe("account explorer on a phone", () => {
  it("folds the lens explorer and the plan to a line each, and a tapped agent opens its seat", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    // The folds measure heights as they open; jsdom has no layout to scroll.
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<Settled />);
    const lens = screen.getByRole("button", { name: /Explore one lens at a time/ });
    const plan = screen.getByRole("button", { name: /The first-call plan/ });
    expect(lens).toHaveAttribute("aria-expanded", "false");
    expect(plan).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Two critic seats, Expand and Distill")).toBeInTheDocument();
    expect(screen.getByText("First call · Stack · Why now · Objection · Research · 2 sources")).toBeInTheDocument();
    expect(screen.queryByText("Worth 30 minutes")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Stack" })).not.toBeInTheDocument();

    // A finished agent's tile opens the fold first, then scrolls to it.
    act(() => screen.getByText("settle").click());
    fireEvent.click(await screen.findByRole("button", { name: "CFO: open" }));
    expect(lens).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(screen.getByRole("heading", { name: "Not this year" })).toBeInTheDocument());
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;

    // The plan opens on a tap, with Copy plan in its tab row.
    fireEvent.click(plan);
    expect(screen.getByRole("tab", { name: "Stack" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy plan" })).toBeInTheDocument();
    scrollTo.mockRestore();
  });
});

describe("agent board", () => {
  it("lights tiles from live events, then fills the rest from the response", async () => {
    const { result } = renderHook(() => useAgentBoard());
    await act(() => result.current.listen("report-1"));
    expect(result.current.board.tiles["persona-skeptic"].status).toBe("running");
    act(() => onEvent?.({ new: { agent: "persona-skeptic", event_type: "completed", data: { headline: "Not this year", latency_ms: 4100 } } }));
    expect(result.current.board.tiles["persona-skeptic"]).toMatchObject({ status: "done", ms: 4100, teaser: "Not this year" });
    act(() => onEvent?.({ new: { agent: "orchestrator", event_type: "phase1-complete", data: {} } }));
    expect(result.current.board.verdict).toBe("writing");
    vi.useFakeTimers();
    act(() => result.current.settle(analysis));
    act(() => vi.advanceTimersByTime(3000));
    vi.useRealTimers();
    expect(result.current.board.tiles["persona-champion"].status).toBe("done");
    expect(result.current.board.tiles["persona-builder"].status).toBe("failed");
    expect(result.current.board.verdict).toBe("done");
  });

  it("replays a saved run in the order the agents finished", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAgentBoard());
    act(() => result.current.settle(analysis, { replay: true }));
    expect(result.current.board.tiles.distill.status).toBe("running");
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.board.tiles.distill.status).toBe("done");
    expect(result.current.board.tiles["persona-champion"].status).toBe("running");
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.board.tiles["persona-champion"].status).toBe("done");
    expect(result.current.board.verdict).toBe("done");
    vi.useRealTimers();
  });
});

describe("saved runs strip", () => {
  it("loads each run and opens it", async () => {
    rpc.mockResolvedValue({ data: { id: "r1", idea: "Acme Outfitters", brief, lovable_prompt: "plan", auto_analysis: analysis, created_at: "2026-10-07T13:12:00Z" }, error: null });
    const onOpen = vi.fn();
    render(<TerritoryStrip runs={[{ company: "Acme Outfitters", reportId: "r1" }]} title="Saved runs" onOpen={onOpen} />);
    await waitFor(() => expect(screen.getByText("B")).toBeInTheDocument());
    expect(screen.getByText(/outdoor retailer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Acme Outfitters/ }));
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }));
  });
});

describe("explorer text helpers", () => {
  it("parses lists, why-now lines, critic markdown and seat names", () => {
    expect(asList("['a', \"b's\"]")).toEqual(["a", "b's"]);
    expect(whyNowItems("Date not found: x [1]\n2026-09: y [2]")).toEqual([
      { date: "2026-09", text: "y [2]" },
      { date: "", text: "x [1]" },
    ]);
    expect(criticParagraphs("## Take\n\n**Bold** point.\n\n## Challenge Questions\n1. q")).toEqual(["Bold point."]);
    expect(relabelSeats("The Skeptic argues X while the Builder counters")).toBe("The CFO argues X while the Analytics engineer counters");
    // A customer quoted in the account's marketing doesn't sit in its seats.
    expect(seatPeople([{ name: "A", role: "Chief Data Officer, Northern Bank (nCino customer, quoted in nCino marketing)", source: 1 }])).toEqual({});
    expect(seatPeople([{ name: "B", role: "VP of Data", source: 2 }]).champion?.name).toBe("B");
  });
});
