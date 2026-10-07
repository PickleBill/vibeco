import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The Supabase client: function calls recorded.
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

import { BeyondTerritory } from "@/components/territory/lookalikes/BeyondTerritory";
import { excludeFrom, readSuggestions, researchHref, type BeyondSeed } from "@/components/territory/lookalikes/beyond";

const seed: BeyondSeed = { name: "Relay", domain: "relaypro.com", motion: "Embedded", line: "Safety platform for frontline teams.", tools: ["Snowflake"] };
const rows = [
  { name: "Equifax", domain: "equifax.com" },
  { name: "Relay", domain: "relaypro.com" },
  { name: "Agilysys", domain: undefined },
];
const suggestions = [
  { name: "Cardlytics", domain: "cardlytics.com", hq: "Atlanta, GA", why: "May ship customer-facing reporting to its bank partners.", motion_guess: "Embedded" },
  { name: "Greenlight", domain: "greenlight.com", why: "Might run a data team on a warehouse.", motion_guess: "Internal" },
];

const renderIt = (s: BeyondSeed = seed) =>
  render(
    <MemoryRouter>
      <BeyondTerritory seller="omni" seed={s} rows={rows} />
    </MemoryRouter>,
  );

beforeEach(() => {
  invoke.mockReset();
});

describe("Beyond the territory", () => {
  it("starts idle: one line and one primary button, no call", () => {
    renderIt();
    expect(screen.getByRole("heading", { name: "Companies like Relay that aren’t in your territory yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find new companies like Relay" })).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("asks with the seed and the territory to exclude, then shows hypotheses with a research link", async () => {
    invoke.mockResolvedValue({ data: { suggestions, model: "m", latencyMs: 1 }, error: null });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "Find new companies like Relay" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Usually 10 to 25 seconds.");

    const list = await screen.findByRole("list", { name: "Suggestions like Relay" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    expect(first.getByRole("heading", { name: "Cardlytics" })).toBeInTheDocument();
    expect(first.getByText("Hypothesis")).toBeInTheDocument();
    expect(first.getByText("May ship customer-facing reporting to its bank partners.")).toBeInTheDocument();
    expect(first.getByText("Motion guess: Embedded")).toBeInTheDocument();
    expect(first.getByText("Atlanta, GA")).toBeInTheDocument();
    // No domains on the card: the one link researches it live.
    expect(first.queryByText(/cardlytics\.com/)).toBeNull();
    expect(first.getByRole("link", { name: /Research it live/ })).toHaveAttribute("href", "/for/omni/account?run=Cardlytics%20(cardlytics.com)");
    expect(screen.getByText("AI suggestions, not researched yet. Each website answered when checked.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Find again" })).toBeInTheDocument();

    const [name, opts] = invoke.mock.calls[0] as [string, { body: { seed: BeyondSeed; exclude: string[] } }];
    expect(name).toBe("suggest-accounts");
    expect(opts.body.seed).toEqual(seed);
    expect(opts.body.exclude).toEqual(["Equifax", "equifax.com", "Relay", "relaypro.com", "Agilysys"]);
  });

  it("says so when nothing survives, and offers Try again on an error", async () => {
    invoke.mockResolvedValueOnce({ data: { suggestions: [] }, error: null });
    renderIt();
    fireEvent.click(screen.getByRole("button", { name: "Find new companies like Relay" }));
    expect(await screen.findByText(/No suggestion passed the checks/)).toBeInTheDocument();

    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: "x" }), { status: 500 }) } });
    fireEvent.click(screen.getByRole("button", { name: "Find again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("didn’t finish on our side");
    invoke.mockResolvedValueOnce({ data: { suggestions }, error: null });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("list", { name: "Suggestions like Relay" })).toBeInTheDocument();
  });

  it("a new seed clears the results", async () => {
    invoke.mockResolvedValue({ data: { suggestions }, error: null });
    const { rerender } = renderIt();
    fireEvent.click(screen.getByRole("button", { name: "Find new companies like Relay" }));
    await screen.findByRole("list", { name: "Suggestions like Relay" });
    rerender(
      <MemoryRouter>
        <BeyondTerritory seller="omni" seed={{ ...seed, name: "Equifax", domain: "equifax.com" }} rows={rows} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByRole("list", { name: /Suggestions like/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Find new companies like Equifax" })).toBeInTheDocument();
  });
});

describe("beyond helpers", () => {
  it("excludeFrom lists names and domains once, case-insensitively", () => {
    expect(excludeFrom([{ name: "Relay", domain: "relaypro.com" }, { name: "relay" }], { name: "Acme", domain: "RelayPro.com" })).toEqual(["Relay", "relaypro.com", "Acme"]);
  });

  it("readSuggestions keeps well-formed rows only", () => {
    expect(
      readSuggestions({
        suggestions: [...suggestions, { name: "No domain", why: "May.", motion_guess: "Both" }, { name: "Bad motion", domain: "x.com", why: "May.", motion_guess: "Sideways" }, null],
      }).map((s) => s.name),
    ).toEqual(["Cardlytics", "Greenlight"]);
    expect(readSuggestions(null)).toEqual([]);
  });

  it("researchHref types the company into Run an account", () => {
    expect(researchHref("omni", { name: "A&B Co", domain: "ab.com" })).toBe("/for/omni/account?run=A%26B%20Co%20(ab.com)");
  });
});
