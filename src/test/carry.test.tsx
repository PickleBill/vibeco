import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { SavedReport } from "@/components/account/explorer/savedRuns";

// Saved runs resolve through the shared-report RPC; the tests answer it from `runs`. No live calls.
const runs: Record<string, SavedReport> = {};
const invoke = vi.fn();
const channel = { on: () => channel, subscribe: () => channel };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (_fn: string, args: { _report_id: string }) => ({ data: runs[args._report_id] ?? null, error: null }),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    channel: () => channel,
    removeChannel: vi.fn(),
  },
}));

import { pickCurrent, readCurrent, readRan, rememberCurrent, rememberRan, useCurrentAccount } from "@/components/territory/current";
import { MODULES, nextStep, railHref, type ModuleId } from "@/components/territory/nav";
import { NextStep } from "@/components/territory/NextStep";
import { TerritoryShell } from "@/components/territory/TerritoryShell";
import { AccountSwitcher } from "@/components/territory/AccountSwitcher";
import { AccountModule } from "@/components/territory/modules/AccountModule";
import { LookalikesModule } from "@/components/territory/modules/LookalikesModule";
import { seedOptions } from "@/components/territory/lookalikes/useSeed";
import { tourSteps } from "@/components/territory/tour/steps";
import { toRow } from "@/components/territory/model";
import { getSeller } from "@/lib/sellers";
import ForSeller from "@/pages/ForSeller";

const seller = getSeller("omni")!;
const accounts = [
  { company: "Relay (relaypro.com)", reportId: "relay" },
  { company: "Bandwidth (bandwidth.com)", reportId: "band" },
];
const scoped = { ...seller, territory: { name: "Southeast", accounts } };

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  invoke.mockReset();
});
afterEach(() => vi.restoreAllMocks());

// ─── Which account is current ───

describe("current account", () => {
  it("takes the URL's id first, then the session's, then the territory's first", () => {
    expect(pickCurrent({ urlId: "band", sessionId: "relay", accounts })).toEqual({ id: "band" });
    expect(pickCurrent({ sessionId: "band", accounts })).toEqual({ id: "band" });
    expect(pickCurrent({ accounts })).toEqual({ id: "relay" });
    expect(pickCurrent({ accounts: [] })).toEqual({ id: undefined });
  });

  it("remembers an id from the URL for the rest of the session, per seller", () => {
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useCurrentAccount("omni", id, accounts), { initialProps: { id: "band" } });
    expect(result.current.id).toBe("band");
    expect(readCurrent("omni")).toBe("band");
    expect(readCurrent("acme")).toBeUndefined();
    rerender({ id: undefined });
    expect(result.current).toEqual({ id: "band" });
  });

  it("falls back to the first account when session storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberCurrent("omni", "band")).not.toThrow();
    const { result } = renderHook(() => useCurrentAccount("omni", undefined, accounts));
    expect(result.current).toEqual({ id: "relay" });
  });
});

// ─── The rail ───

describe("rail links", () => {
  it("run in the order run, radar, lookalikes, committee, deal room", () => {
    expect(MODULES.map((m) => `${m.idx} ${m.label}`)).toEqual(["01 Run an account", "02 Radar", "03 Lookalikes", "04 Committee", "05 Deal Room"]);
  });

  it("carry the account into the committee and deal room; run an account is always the empty form", () => {
    const current = { id: "band" };
    expect(railHref("omni", "radar", current)).toBe("/for/omni/radar");
    expect(railHref("omni", "account", current)).toBe("/for/omni");
    expect(railHref("omni", "committee", current)).toBe("/for/omni/committee/band");
    expect(railHref("omni", "deal", current)).toBe("/for/omni/deal/band");
    expect(railHref("omni", "lookalikes", current)).toBe("/for/omni/lookalikes");
    expect(railHref("omni", "account")).toBe("/for/omni");
  });

  /** The shell on the command center's route, the way the page wires it. */
  function Page() {
    const { module = "account", reportId } = useParams<{ module?: string; reportId?: string }>();
    const current = useCurrentAccount(scoped.id, reportId, accounts);
    return (
      <TerritoryShell seller={scoped} module={module as ModuleId} territory={{ rows: [], loading: false, missing: [] }} current={current}>
        <Where />
      </TerritoryShell>
    );
  }
  const page = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/for/:seller/:module?/:reportId?" element={<Page />} />
        </Routes>
      </MemoryRouter>,
    );
  const railLink = (name: RegExp) => within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { name });

  it("follow the URL's account, then the session's, then the first", () => {
    // Looking at Bandwidth in the committee: the deal room opens on Bandwidth, not the first account.
    const first = page("/for/omni/committee/band");
    expect(railLink(/Deal Room/)).toHaveAttribute("href", "/for/omni/deal/band");
    expect(railLink(/Run an account/)).toHaveAttribute("href", "/for/omni");
    expect(railLink(/Radar/)).toHaveAttribute("href", "/for/omni/radar");
    expect(railLink(/Lookalikes/)).toHaveAttribute("href", "/for/omni/lookalikes");
    first.unmount();

    // Later, on a view without an id: the session still has Bandwidth.
    const second = page("/for/omni/lookalikes");
    expect(railLink(/Committee/)).toHaveAttribute("href", "/for/omni/committee/band");
    fireEvent.click(railLink(/Deal Room/));
    expect(screen.getByTestId("where")).toHaveTextContent("/for/omni/deal/band");
    second.unmount();

    // A new session: the first account, and an empty run form at the front door.
    window.sessionStorage.clear();
    page("/for/omni");
    expect(railLink(/Committee/)).toHaveAttribute("href", "/for/omni/committee/relay");
    expect(railLink(/Run an account/)).toHaveAttribute("href", "/for/omni");
    expect(railLink(/Run an account/)).toHaveAttribute("aria-current", "page");
  });

  it("set Run an account apart; the other four sit under an Explore label that isn't a link", () => {
    page("/for/omni/radar");
    const nav = screen.getByRole("navigation", { name: "Views" });
    const label = within(nav).getByText("Explore");
    expect(label.closest("a")).toBeNull();
    const links = within(nav).getAllByRole("link");
    expect(links[0]).toHaveTextContent("Run an account");
    expect(links[0].compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(label.compareDocumentPosition(links[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("walk the ?demo presenter bar through four steps on the first account, with the Deal Room off the path", () => {
    const step = page("/for/omni/account/relay?demo");
    expect(screen.getByText("Demo · step 1 of 4 · Three whys, seven agents, a verdict")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open the radar/ })).toHaveAttribute("href", "/for/omni/radar?demo");
    step.unmount();
    const radar = page("/for/omni/radar?demo");
    expect(screen.getByText(/^Demo · step 2 of 4/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Find lookalikes/ })).toHaveAttribute("href", "/for/omni/lookalikes/relay?demo");
    radar.unmount();
    const last = page("/for/omni/committee/relay?demo");
    expect(screen.getByText(/^Demo · step 4 of 4/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Run your own account/ })).toHaveAttribute("href", "/for/omni");
    last.unmount();
    page("/for/omni/deal/relay?demo");
    expect(screen.getByText("Demo · off the path")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to step 1/ })).toHaveAttribute("href", "/for/omni/account/relay?demo");
  });
});

// ─── The front door ───

describe("front door", () => {
  const open = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/for/:seller/:module?/:reportId?"
            element={
              <>
                <Where />
                <ForSeller />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  const current = () => within(screen.getByRole("navigation", { name: "Views" })).getByRole("link", { current: "page" });
  // The first pinned saved run resolves (saved runs are cached for the page's life, so set it before any render).
  const pin = seller.savedRuns[0];
  beforeAll(() => {
    runs[pin.reportId] = saved(pin.reportId, pin.company);
  });

  it("is Run an account", async () => {
    open("/for/omni");
    expect(current()).toHaveTextContent("Run an account");
    expect(await screen.findByRole("textbox", { name: "Which company?" })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/);
  });

  it("is the empty form every time: saved and live quick picks and a link to the radar; the Run tab comes back to it", async () => {
    const pinName = pin.company.replace(/\s*\([^)]*\)\s*$/, "");
    open("/for/omni");
    const savedRow = await screen.findByRole("group", { name: "Saved · opens instantly" });
    expect(within(savedRow).getByRole("button", { name: pinName })).toBeInTheDocument();
    const liveRow = screen.getByRole("group", { name: "Live · about a minute" });
    expect(within(liveRow).getAllByRole("button").map((b) => b.textContent)).toEqual(seller.examples);
    expect(screen.getByRole("link", { name: `All ${seller.territory!.accounts.length} territory accounts on the Radar` })).toHaveAttribute("href", "/for/omni/radar");
    // The big saved-run cards are gone from the front door.
    expect(screen.queryByText(/Saved runs · open instantly/)).toBeNull();

    // A saved pill opens the run at once, tagged as saved, with no AI calls.
    fireEvent.click(within(savedRow).getByRole("button", { name: pinName }));
    expect(await screen.findByText(/^Saved run · /)).toBeInTheDocument();
    expect(screen.getByText("opened instantly, no AI calls")).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/account/${pin.reportId}`));

    // The rail's Run tab never carries the run: it's the empty form again.
    expect(current()).toHaveAttribute("href", "/for/omni");
    fireEvent.click(current());
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/));
    expect(await screen.findByRole("group", { name: "Saved · opens instantly" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Which company?" })).toHaveValue("");
    expect(screen.queryByText(/^Saved run · /)).toBeNull();
  });

  it("runs ?run=<company> live once, with the company in the box, then drops the param", async () => {
    invoke.mockImplementation(() => new Promise(() => {}));
    open("/for/omni/account?run=Cardlytics%20(cardlytics.com)");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/));
    expect(await screen.findByText(/^Live run ·/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Which company?" })).toHaveValue("Cardlytics (cardlytics.com)");
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("simulate-idea", expect.objectContaining({ body: expect.objectContaining({ type: "research", idea: "Cardlytics (cardlytics.com)" }) }));
  });

  it("keeps an old radar link with a segment on the radar", async () => {
    open("/for/omni?segment=strategic");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/for/omni/radar?segment=strategic"));
    expect(current()).toHaveTextContent("Radar");
  });

  it("starts the presenter walkthrough on the demo account", async () => {
    open("/for/omni?demo");
    const relay = seller.territory!.accounts[0].reportId;
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/account/${relay}?demo`));
    expect(screen.getByText(/^Demo · step 1 of 4/)).toBeInTheDocument();
  });
});

// ─── The 60-second demo ───

describe("tour steps", () => {
  it("are four, in rail order, short, and skip the Deal Room", () => {
    const steps = tourSteps("Relay");
    expect(steps.map((s) => s.module)).toEqual(["account", "radar", "lookalikes", "committee"]);
    expect(steps.every((s) => s.body.split(/\s+/).length <= 18)).toBe(true);
    expect(steps[0].body).toMatch(/^Relay’s saved run/);
    expect(steps[3].title).toBe("Committee for Relay");
  });
});

// ─── What next ───

describe("next step", () => {
  const band = { id: "band", name: "Bandwidth" };

  it("follows the story from each view, for the account in hand", () => {
    expect(nextStep("omni", "account", band)).toEqual({ to: "lookalikes", label: "Find accounts like Bandwidth", href: "/for/omni/lookalikes/band" });
    expect(nextStep("omni", "radar", band)).toEqual({ to: "account", label: "Open Bandwidth", href: "/for/omni/account/band" });
    expect(nextStep("omni", "lookalikes", band)).toEqual({ to: "committee", label: "Simulate Bandwidth’s committee", href: "/for/omni/committee/band" });
    expect(nextStep("omni", "lookalikes", { id: "x", name: "Acme Outfitters" })?.label).toBe("Simulate Acme Outfitters’ committee");
    expect(nextStep("omni", "committee", band)).toEqual({ to: "account", label: "Run another account", href: "/for/omni" });
    expect(nextStep("omni", "deal", band)).toEqual({ to: "radar", label: "Back to the radar", href: "/for/omni/radar" });
    // No account in hand: no step that needs one; the committee and deal room never need one.
    expect(nextStep("omni", "account")).toBeNull();
    expect(nextStep("omni", "lookalikes")).toBeNull();
    expect(nextStep("omni", "committee")?.href).toBe("/for/omni");
  });

  it("is one quiet row, and stays out of the presenter walkthrough", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/for/omni/account/band"]}>
        <NextStep seller="omni" from="account" account={band} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", { name: "Next step" });
    expect(nav).toHaveTextContent("Next · 03 Lookalikes");
    expect(within(nav).getByRole("link", { name: "Find accounts like Bandwidth" })).toHaveAttribute("href", "/for/omni/lookalikes/band");
    unmount();
    render(
      <MemoryRouter initialEntries={["/for/omni/account/band?demo"]}>
        <NextStep seller="omni" from="account" account={band} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("navigation", { name: "Next step" })).toBeNull();
  });
});

// ─── Run an account with a saved run open ───

const brief: AccountBrief = {
  lens: "account",
  seller: "omni",
  company: "Bandwidth",
  research: {
    provider: "firecrawl",
    sources: [{ id: 1, title: "Data Engineer at Bandwidth", url: "https://example.com/job", snippet: "Snowflake", kind: "jobs" }],
  },
  account_line: "Bandwidth runs a communications platform [1].",
  revenue_model: "2026-09: Hiring data engineers [1].",
  core_features: [{ name: "Warehouse", tool: "Snowflake", status: "Confirmed", sources: [1], description: "", evidence: "We run Snowflake." }],
  start_with: { role: "Head of Data", why: "Owns the stack [1]." },
  discovery_questions: ["Who owns reporting today?"],
  fit: { grade: "B", motion: "Internal", reason: "Hiring, no trigger." },
  motion: {
    label: "Internal",
    internal: { sources: [1], evidence: [{ source: 1, signal: "Snowflake", quote: "Warehouse: Snowflake" }], clock: "", buyer: "", question: "Who owns the warehouse?" },
    embedded: { sources: [], evidence: [], clock: "", buyer: "", question: "" },
  },
  customer_list: { on_list: false, sentence: "" },
} as AccountBrief;

const saved = (id: string, idea: string): SavedReport => ({ id, idea, brief: { ...brief, company: idea }, lovable_prompt: "FIRST-CALL PLAN", auto_analysis: null, created_at: "2026-10-06T21:00:00Z" });

describe("run an account, saved run open", () => {
  it("re-runs the saved run as a secondary action, keeps the pink button for a new company, and follows the picker", async () => {
    runs.band = saved("band", "Bandwidth (bandwidth.com)");
    runs.relay = saved("relay", "Relay (relaypro.com)");
    const rows = accounts.map((a) => toRow(a, runs[a.reportId]));
    render(
      <MemoryRouter initialEntries={["/for/omni/account/band"]}>
        <Routes>
          <Route
            path="/for/:seller/:module?/:reportId?"
            element={
              <>
                <Where />
                <RouteAccount rows={rows} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/^Saved run · /)).toBeInTheDocument();
    const live = screen.getByRole("button", { name: "Run it live" });
    expect(live.className).not.toMatch(/bg-brand/);
    expect(screen.queryByRole("button", { name: /Build the plan/ })).toBeNull();
    // Next: accounts like this one.
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link")).toHaveAttribute("href", "/for/omni/lookalikes/band");
    // A territory account isn't "just ran".
    expect(readRan("omni")).toBeUndefined();

    // A different company in the box: the pink primary builds a new plan.
    fireEvent.change(screen.getByRole("textbox", { name: "Which company?" }), { target: { value: "Ramp" } });
    expect(screen.getByRole("button", { name: /Build the plan/ }).className).toMatch(/bg-brand/);
    expect(invoke).not.toHaveBeenCalled();

    // The territory picker opens another saved run, and the URL (and so the rail) follows it.
    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Saved runs" }), { target: { value: "relay" } });
    });
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/for/omni/account/relay"));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Which company?" })).toHaveValue("Relay (relaypro.com)"));
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link", { name: "Find accounts like Relay" })).toHaveAttribute(
      "href",
      "/for/omni/lookalikes/relay",
    );
  });
});

// ─── A run from outside the territory flows through the other views ───

describe("just ran", () => {
  const ramp = { id: "ramp", name: "Ramp" };

  it("is recorded when Run an account opens a run outside the territory, and becomes the current account's companion", async () => {
    runs.ramp = saved("ramp", "Ramp (ramp.com)");
    runs.band = saved("band", "Bandwidth (bandwidth.com)");
    runs.relay = saved("relay", "Relay (relaypro.com)");
    const rows = accounts.map((a) => toRow(a, runs[a.reportId]));
    render(
      <MemoryRouter initialEntries={["/for/omni/account/ramp"]}>
        <Routes>
          <Route path="/for/:seller/:module?/:reportId?" element={<RouteAccount rows={rows} />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/^Saved run · /)).toBeInTheDocument();
    expect(readRan("omni")).toEqual(ramp);
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link", { name: "Find accounts like Ramp" })).toHaveAttribute(
      "href",
      "/for/omni/lookalikes/ramp",
    );

    // Every view gets it from the current account; a territory account never shows as "just ran".
    const { result } = renderHook(() => useCurrentAccount("omni", undefined, accounts));
    expect(result.current.ran).toEqual(ramp);
    rememberRan("omni", { id: "band", name: "Bandwidth" });
    expect(renderHook(() => useCurrentAccount("omni", undefined, accounts)).result.current.ran).toBeUndefined();
  });

  it("is a Lookalikes seed, selected when the run view's next step opens it", async () => {
    runs.ramp = saved("ramp", "Ramp (ramp.com)");
    const rows = accounts.map((a) => toRow(a, saved(a.reportId, a.company)));
    const options = seedOptions(scoped, rows, ramp);
    expect(options[0]).toEqual({ reportId: "ramp", name: "Ramp", kind: "recent" });
    // Already listed (a territory account): no second entry.
    expect(seedOptions(scoped, rows, { id: "band", name: "Bandwidth" }).filter((o) => o.reportId === "band")).toHaveLength(1);

    render(
      <MemoryRouter initialEntries={["/for/omni/lookalikes/ramp"]}>
        <LookalikesModule seller={scoped} territory={{ rows, loading: false, missing: [] }} reportId="ramp" justRan={ramp} />
      </MemoryRouter>,
    );
    const chip = screen.getByRole("button", { name: /Ramp.*Just ran/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts that look like Ramp" })).toBeInTheDocument();
    // Next: the top match's committee.
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link", { name: /^Simulate .+ committee$/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/for\/omni\/committee\/(relay|band)$/),
    );
  });

  it("comes first in the committee and deal room switcher, as chips or as a select", () => {
    const rows = accounts.map((a) => toRow(a, saved(a.reportId, a.company)));
    const first = render(
      <MemoryRouter>
        <AccountSwitcher rows={rows} activeId="ramp" hrefFor={(id) => `/for/omni/committee/${id}`} justRan={ramp} />
      </MemoryRouter>,
    );
    const chips = screen.getAllByRole("radio");
    expect(chips[0]).toHaveTextContent("Just ran: Ramp");
    expect(chips[0]).toHaveAttribute("aria-checked", "true");
    first.unmount();

    const many = [...rows, ...Array.from({ length: 8 }, (_, i) => ({ ...rows[0], id: `pad${i}`, name: `Pad ${i}` }))];
    render(
      <MemoryRouter>
        <AccountSwitcher rows={many} activeId="ramp" hrefFor={(id) => `/for/omni/committee/${id}`} justRan={ramp} />
      </MemoryRouter>,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("ramp");
    expect(within(select).getAllByRole("option")[0]).toHaveTextContent("Just ran: Ramp");
  });
});

function RouteAccount({ rows }: { rows: ReturnType<typeof toRow>[] }) {
  const { reportId } = useParams<{ reportId?: string }>();
  // Past eight accounts the picker is a select; pad the territory so the test drives it the same way.
  const many = [...rows, ...Array.from({ length: 8 }, (_, i) => ({ ...rows[0], id: `pad${i}`, name: `Pad ${i}` }))];
  return <AccountModule seller={scoped} territory={{ rows: many, loading: false, missing: [] }} reportId={reportId} />;
}
