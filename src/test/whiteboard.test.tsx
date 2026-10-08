import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

// The Supabase client: function calls recorded.
const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) }, rpc: vi.fn(() => Promise.resolve({ data: null, error: null })) },
}));

import { BLOB_DEPOT, DREAMSHIP } from "@/components/territory/whiteboard/examples";
import { casesFrom, money, priceCase, readRiffResult, riffText } from "@/components/territory/whiteboard/model";
import { Whiteboard } from "@/components/territory/whiteboard/Whiteboard";

beforeEach(() => {
  invoke.mockReset();
  try {
    localStorage.clear();
  } catch {
    // no storage
  }
});

const base = { endCustomers: 2000, adoptionPct: 10, pricePerMonth: 29, seats: 3, platformFee: 25000, perCustomerYear: 60, perSeatYear: 60, customYear: 90000 };

describe("price to value", () => {
  it("prices a tier and the seller's fee three ways, in code", () => {
    const perCustomer = priceCase(base, "platform_plus_per_customer");
    expect(perCustomer.paying).toBe(200);
    expect(perCustomer.tierArr).toBe(200 * 29 * 12);
    expect(perCustomer.omniArr).toBe(25000 + 200 * 60);
    expect(perCustomer.keep).toBe(69600 - 37000);
    expect(priceCase(base, "platform_plus_per_seat").omniArr).toBe(25000 + 200 * 3 * 60);
    expect(priceCase(base, "custom").omniArr).toBe(90000);
    expect(priceCase({ ...base, adoptionPct: 0 }, "custom").take).toBe(0);
    expect(money(69600)).toBe("$69.6K");
    expect(money(1_896_000)).toBe("$1.9M");
    expect(money(-12_000)).toBe("-$12K");
  });

  it("reads the low and high cases from a riff's assumptions", () => {
    const { low, high } = casesFrom(BLOB_DEPOT.riff.gtm.assumptions);
    expect([low.endCustomers, high.endCustomers, low.pricePerMonth, high.pricePerMonth]).toEqual([2000, 8000, 29, 79]);
  });
});

describe("reading a riff", () => {
  it("keeps a well-formed answer, strips dashes and fills missing ranges; junk is null", () => {
    const read = readRiffResult({
      riff: { ...DREAMSHIP.riff, headline: "An idea — with a dash", gtm: { ...DREAMSHIP.riff.gtm, assumptions: { end_customers: [9, "x"] } } },
      sources: [...DREAMSHIP.sources, { id: 9, title: "Not a link", url: "javascript:alert(1)" }],
      cached: true,
    });
    expect(read?.riff.headline).toBe("An idea, with a dash");
    expect(read?.riff.gtm.assumptions.end_customers).toEqual([500, 5000]);
    expect(read?.sources.map((s) => s.id)).toEqual(DREAMSHIP.sources.map((s) => s.id));
    expect(read?.cached).toBe(true);
    expect(readRiffResult({ riff: {} })).toBeNull();
    expect(readRiffResult("nope")).toBeNull();
  });

  it("copies as plain text for a rep: the idea, the price model, the sources and the footer, no dashes", () => {
    const { low, high } = casesFrom(DREAMSHIP.riff.gtm.assumptions);
    const shape = DREAMSHIP.riff.gtm.pricing_shape;
    const text = riffText(DREAMSHIP, shape, { low: priceCase(low, shape), high: priceCase(high, shape) });
    expect(text).toContain(`Whiteboard: ${DREAMSHIP.riff.company}`);
    expect(text).toContain(DREAMSHIP.riff.headline);
    expect(text).toContain("Their new tier:");
    expect(text).toContain("[1] Dreamship: company profile https://dreamship.com/");
    expect(text).toContain("Exploratory brief. Not an Omni product; figures are estimates.");
    expect(text).not.toMatch(/[—–]/);
  });
});

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

const renderBoard = (path = "/for/omni/deal", account?: { name: string; typed: string }) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Whiteboard seller="Omni" account={account} />
              <Where />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );

describe("the whiteboard", () => {
  it("opens the illustrative example instantly, with no call: sketches, the price model and the footer", () => {
    renderBoard();
    expect(screen.getByRole("heading", { name: "What if a company put Omni inside its own product?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Blob Depot/ }));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "What if Blob Depot put Omni inside its own product?" })).toBeInTheDocument();
    const card = within(screen.getByRole("article"));
    expect(card.getByText("Made-up company")).toBeInTheDocument();
    expect(card.getByText("Illustrative example")).toBeInTheDocument();
    expect(card.getAllByText("sketch")).toHaveLength(3);
    expect(card.getByText("Pro portal home")).toBeInTheDocument();
    expect(card.getByText("Exploratory brief. Not an Omni product; figures are estimates.")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("?riff=Blob+Depot");
    // No "fresh" run for a made-up company.
    expect(card.queryByRole("button", { name: /Riff it fresh/ })).toBeNull();
  });

  it("recalculates the price model as you type", () => {
    renderBoard("/for/omni/deal?riff=Blob%20Depot");
    const tier = () => screen.getByText("Their new tier, a year").parentElement!;
    expect(tier()).toHaveTextContent("$69.6K to $1.9M");
    fireEvent.change(screen.getByLabelText("Share who pay for the tier, low case"), { target: { value: "20" } });
    expect(tier()).toHaveTextContent("$139.2K to $1.9M");
    // Per seat: the seat rows appear and the seller's fee follows them.
    fireEvent.click(screen.getByRole("radio", { name: "Platform + per seat" }));
    expect(screen.getByLabelText("Seats per account, low case")).toBeInTheDocument();
    expect(screen.queryByLabelText(/fee per paying account, low case/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Back to the riff/ }));
    expect(tier()).toHaveTextContent("$69.6K to $1.9M");
  });

  it("riffs a real company through the function and shows its sources and known claims", async () => {
    invoke.mockResolvedValue({ data: { ...DREAMSHIP, model: "anthropic/claude-sonnet-5", latencyMs: 21000 }, error: null });
    renderBoard();
    fireEvent.change(screen.getByRole("textbox", { name: "Which company?" }), { target: { value: "Dreamship (dreamship.com)" } });
    fireEvent.click(screen.getByRole("button", { name: /Riff it/ }));
    expect(await screen.findByText(DREAMSHIP.riff.headline)).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("partner-riff", { body: { company: "Dreamship (dreamship.com)", seller: "omni", fresh: false } });
    const card = within(screen.getByRole("article"));
    expect(card.getAllByText("Known").length).toBeGreaterThan(0);
    expect(card.getByText(`${DREAMSHIP.sources.length} sources`)).toBeInTheDocument();
    expect(card.getByText("Live · 21s")).toBeInTheDocument();
    expect(card.queryByText(/Saved riff/)).toBeNull();
    expect(within(card.getByRole("list", { name: "Sources" })).getAllByRole("link")).toHaveLength(DREAMSHIP.sources.length);
    // Remembered for next time, as a chip.
    expect(screen.getByRole("button", { name: "Dreamship" })).toBeInTheDocument();
  });

  it("never leaves a blank board: a failure says so, keeps the examples, and offers a retry", async () => {
    invoke.mockResolvedValue({ data: null, error: { message: "boom", context: { status: 500 } } });
    renderBoard("/for/omni/deal?riff=Somebody");
    expect(await screen.findByRole("alert")).toHaveTextContent("No riff on Somebody this time");
    expect(screen.getByRole("button", { name: /Blob Depot/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Somebody again" })).toBeInTheDocument();
  });

  it("leads with the internal play when embedded doesn't fit, and offers the carried account as a riff", async () => {
    const notFit = {
      ...DREAMSHIP,
      riff: { ...DREAMSHIP.riff, company: "Chick-fil-A", embedded_fit: { verdict: "not_a_fit", why: "It sells food, not software." }, internal_play: "Franchise performance on one model." },
    };
    invoke.mockResolvedValue({ data: notFit, error: null });
    renderBoard("/for/omni/deal", { name: "Chick-fil-A", typed: "Chick-fil-A (chick-fil-a.com)" });
    fireEvent.click(screen.getByRole("button", { name: "Riff Chick-fil-A" }));
    await waitFor(() => expect(screen.getByRole("note")).toHaveTextContent("Not an embedded fit."));
    expect(screen.getByRole("region", { name: "The internal play" })).toHaveTextContent("Franchise performance on one model.");
    expect(screen.queryByText("Their new tier, a year")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sketch the embedded price anyway" }));
    expect(screen.getByText("Their new tier, a year")).toBeInTheDocument();
  });
});
