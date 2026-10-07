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

import { pickCurrent, readCurrent, rememberCurrent, useCurrentAccount } from "@/components/territory/current";
import { nextStep, railHref, type ModuleId } from "@/components/territory/nav";
import { NextStep } from "@/components/territory/NextStep";
import { TerritoryShell } from "@/components/territory/TerritoryShell";
import { AccountModule } from "@/components/territory/modules/AccountModule";
import { toRow } from "@/components/territory/model";
import { getSeller } from "@/lib/sellers";

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
  // The welcome card stays away; these tests are about the rail.
  window.localStorage.setItem("vibeco.territory.welcome.omni", "1");
});
afterEach(() => vi.restoreAllMocks());

// ─── Which account is current ───

describe("current account", () => {
  it("takes the URL's id first, then the session's, then the territory's first", () => {
    expect(pickCurrent({ urlId: "band", sessionId: "relay", accounts })).toEqual({ id: "band", opened: "band" });
    expect(pickCurrent({ sessionId: "band", accounts })).toEqual({ id: "band", opened: "band" });
    expect(pickCurrent({ accounts })).toEqual({ id: "relay", opened: undefined });
    expect(pickCurrent({ accounts: [] })).toEqual({ id: undefined, opened: undefined });
  });

  it("remembers an id from the URL for the rest of the session, per seller", () => {
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useCurrentAccount("omni", id, accounts), { initialProps: { id: "band" } });
    expect(result.current.id).toBe("band");
    expect(readCurrent("omni")).toBe("band");
    expect(readCurrent("acme")).toBeUndefined();
    rerender({ id: undefined });
    expect(result.current).toEqual({ id: "band", opened: "band" });
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
    expect(result.current).toEqual({ id: "relay", opened: undefined });
  });
});

// ─── The rail ───

describe("rail links", () => {
  it("carry the account into run, committee and deal room; radar and lookalikes stay plain", () => {
    const current = { id: "band", opened: "band" };
    expect(railHref("omni", "radar", current)).toBe("/for/omni");
    expect(railHref("omni", "account", current)).toBe("/for/omni/account/band");
    expect(railHref("omni", "committee", current)).toBe("/for/omni/committee/band");
    expect(railHref("omni", "deal", current)).toBe("/for/omni/deal/band");
    expect(railHref("omni", "lookalikes", current)).toBe("/for/omni/lookalikes");
    // Nothing opened yet: run an account is the empty form; the others open on the first account.
    expect(railHref("omni", "account", { id: "relay" })).toBe("/for/omni/account");
    expect(railHref("omni", "committee", { id: "relay" })).toBe("/for/omni/committee/relay");
  });

  /** The shell on the command center's route, the way the page wires it. */
  function Page() {
    const { module = "radar", reportId } = useParams<{ module?: string; reportId?: string }>();
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
    expect(railLink(/Run an account/)).toHaveAttribute("href", "/for/omni/account/band");
    expect(railLink(/Radar/)).toHaveAttribute("href", "/for/omni");
    expect(railLink(/Lookalikes/)).toHaveAttribute("href", "/for/omni/lookalikes");
    first.unmount();

    // Later, on a view without an id: the session still has Bandwidth.
    const second = page("/for/omni/lookalikes");
    expect(railLink(/Committee/)).toHaveAttribute("href", "/for/omni/committee/band");
    fireEvent.click(railLink(/Deal Room/));
    expect(screen.getByTestId("where")).toHaveTextContent("/for/omni/deal/band");
    second.unmount();

    // A new session: the first account, and an empty run form.
    window.sessionStorage.clear();
    page("/for/omni");
    expect(railLink(/Committee/)).toHaveAttribute("href", "/for/omni/committee/relay");
    expect(railLink(/Run an account/)).toHaveAttribute("href", "/for/omni/account");
    expect(railLink(/Radar/)).toHaveAttribute("aria-current", "page");
  });
});

// ─── What next ───

describe("next step", () => {
  const band = { id: "band", name: "Bandwidth" };

  it("follows the story from each view, for the account in hand", () => {
    expect(nextStep("omni", "radar", band)).toEqual({ to: "account", label: "Open Bandwidth", href: "/for/omni/account/band" });
    expect(nextStep("omni", "account", band)).toEqual({ to: "committee", label: "Simulate Bandwidth’s committee", href: "/for/omni/committee/band" });
    expect(nextStep("omni", "committee", band)).toEqual({ to: "deal", label: "Build Bandwidth’s Deal Room brief", href: "/for/omni/deal/band" });
    expect(nextStep("omni", "deal", band)).toEqual({ to: "lookalikes", label: "Find accounts like Bandwidth", href: "/for/omni/lookalikes/band" });
    expect(nextStep("omni", "lookalikes")).toEqual({ to: "radar", label: "Back to the radar", href: "/for/omni" });
    expect(nextStep("omni", "committee", { id: "x", name: "Acme Outfitters" })?.label).toBe("Build Acme Outfitters’ Deal Room brief");
    // No account in hand: no step that needs one.
    expect(nextStep("omni", "committee")).toBeNull();
  });

  it("is one quiet row, and stays out of the presenter walkthrough", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/for/omni/deal/band"]}>
        <NextStep seller="omni" from="deal" account={band} />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", { name: "Next step" });
    expect(nav).toHaveTextContent("Next · 05 Lookalikes");
    expect(within(nav).getByRole("link", { name: "Find accounts like Bandwidth" })).toHaveAttribute("href", "/for/omni/lookalikes/band");
    unmount();
    render(
      <MemoryRouter initialEntries={["/for/omni/deal/band?demo"]}>
        <NextStep seller="omni" from="deal" account={band} />
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
    expect(await screen.findByText(/Saved run from/)).toBeInTheDocument();
    const live = screen.getByRole("button", { name: "Run it live" });
    expect(live.className).not.toMatch(/bg-brand/);
    expect(screen.queryByRole("button", { name: /Build the plan/ })).toBeNull();
    // Next: this account's committee.
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link")).toHaveAttribute("href", "/for/omni/committee/band");

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
    expect(within(screen.getByRole("navigation", { name: "Next step" })).getByRole("link", { name: "Simulate Relay’s committee" })).toHaveAttribute(
      "href",
      "/for/omni/committee/relay",
    );
  });
});

function RouteAccount({ rows }: { rows: ReturnType<typeof toRow>[] }) {
  const { reportId } = useParams<{ reportId?: string }>();
  // Past eight accounts the picker is a select; pad the territory so the test drives it the same way.
  const many = [...rows, ...Array.from({ length: 8 }, (_, i) => ({ ...rows[0], id: `pad${i}`, name: `Pad ${i}` }))];
  return <AccountModule seller={scoped} territory={{ rows: many, loading: false, missing: [] }} reportId={reportId} />;
}
