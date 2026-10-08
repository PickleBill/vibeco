import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getSeller } from "@/lib/sellers";
import { HowItWorksButton, TourHost } from "@/components/territory/tour/TourHost";
import { markWelcomeSeen, resetTour, welcomeSeen } from "@/components/territory/tour/store";
import { FALLBACK_AFTER_MS, pickTarget, revealFrom } from "@/components/territory/tour/reveal";

const seller = getSeller("omni")!;
const relay = seller.territory!.accounts[0].reportId;

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

/** The shell's tour pieces on the command center's route, without the views. */
function page(url = "/for/omni") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/for/:seller/:module?/:reportId?"
          element={
            <>
              <HowItWorksButton />
              <Where />
              <TourHost seller={seller} />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const welcome = () => screen.queryByRole("dialog", { name: /territory command center/i });
const tourCard = () => screen.queryByRole("dialog");

beforeEach(() => {
  resetTour();
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe("welcome card", () => {
  it("never opens by itself, even on a first visit, on any view", () => {
    const first = page();
    expect(welcome()).not.toBeInTheDocument();
    first.unmount();
    resetTour();
    page("/for/omni/committee");
    expect(welcome()).not.toBeInTheDocument();
  });

  it("opens from How it works, and ?welcome opens it and leaves the URL clean", () => {
    const first = page();
    fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    expect(welcome()).toBeInTheDocument();
    // The site footer carries the disclaimer; the card doesn't repeat it.
    expect(screen.queryByText(/Not affiliated with/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Explore on my own" }));
    expect(welcome()).not.toBeInTheDocument();
    first.unmount();

    resetTour();
    page("/for/omni?welcome");
    expect(welcome()).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/);
  });

  it("stays out of the way of the ?demo presenter bar", () => {
    page("/for/omni?demo&welcome");
    expect(welcome()).not.toBeInTheDocument();
  });

  it("remembers it was seen, and survives storage that throws (once per page load)", () => {
    expect(welcomeSeen("omni")).toBe(false);
    page();
    fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(welcome()).not.toBeInTheDocument();
    expect(window.localStorage.getItem("vibeco.territory.welcome.omni")).toBe("1");

    resetTour();
    window.localStorage.clear();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(welcomeSeen("omni")).toBe(false);
    expect(() => markWelcomeSeen("omni")).not.toThrow();
    expect(welcomeSeen("omni")).toBe(true);
  });
});

describe("guided tour", () => {
  it("?tour starts at step 1 on the empty front door", () => {
    page("/for/omni/lookalikes?tour");
    expect(welcome()).not.toBeInTheDocument();
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Any company, live" })).toBeInTheDocument();
    expect(screen.getByText(/^Type any company and it runs live in about a minute/)).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/);
    // Focus lands on the default button.
    expect(screen.getByRole("button", { name: /^Next/ })).toHaveFocus();
  });

  it("Next tells the story on the territory's first account and ends in its committee, never the Deal Room", () => {
    page(`/for/omni/account/${relay}?tour`);
    // Step 1 is the empty form, even from a run.
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/);
    const titles = ["Any company, live"];
    const where: string[] = [];
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
      expect(screen.getByText(`${i + 2} of 7`)).toBeInTheDocument();
      titles.push(screen.getByRole("heading").textContent ?? "");
      where.push(screen.getByTestId("where").textContent ?? "");
    }
    expect(titles).toEqual(["Any company, live", "Who they are", "Seven readers, one verdict", "Take a seat", "The territory", "More like it", "The buying room"]);
    expect(where).toEqual([
      `/for/omni/account/${relay}`,
      `/for/omni/account/${relay}`,
      `/for/omni/account/${relay}`,
      "/for/omni/radar",
      `/for/omni/lookalikes/${relay}`,
      `/for/omni/committee/${relay}`,
    ]);
    expect(screen.getByText(/^The Head of Data and the CFO argue it out/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("6 of 7")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/lookalikes/${relay}`);
  });

  it("says who the demo account is and counts the real territory", () => {
    page("/for/omni?tour");
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText("Equifax, the Atlanta credit bureau, signed a $750M acquisition in July. Then why change, why now, why Omni.")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText(`${seller.territory!.accounts.length} Southeast accounts. Pink means a dated trigger in the last 60 days.`)).toBeInTheDocument();
  });

  it("ends with a card that sends you to run your own account", () => {
    page("/for/omni?tour");
    for (let i = 0; i < 7; i++) fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("heading", { name: "Now try your own account" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Run your own account/ }));
    expect(screen.queryByRole("heading", { name: "Now try your own account" })).not.toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni$/);
  });

  it("Esc ends the tour", () => {
    page("/for/omni?tour");
    expect(tourCard()).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.queryByText("1 of 7")).not.toBeInTheDocument();
    expect(tourCard()).not.toBeInTheDocument();
  });

  it("starts from the welcome card", () => {
    page();
    fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    fireEvent.click(screen.getByRole("button", { name: /Demo in 2 minutes/ }));
    expect(welcome()).not.toBeInTheDocument();
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
  });
});

describe("finding a step's target", () => {
  // jsdom lays nothing out: give every element a size, as a browser would.
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 0, left: 0, width: 10, height: 10, right: 10, bottom: 10, x: 0, y: 0, toJSON: () => ({}) });
  });

  it("opens a shut fold, then picks the seat, each only when it's shut or not picked", () => {
    const fold = vi.fn();
    const tab = vi.fn();
    const seat = vi.fn();
    render(
      <>
        <button type="button" aria-expanded={false} onClick={fold}>
          <span data-tour="lens-fold">Explore one lens at a time</span>
        </button>
        <button type="button" role="tab" data-tour="lens-stress" aria-selected onClick={tab}>
          Stress test
        </button>
        <button type="button" data-tour="seat-skeptic" aria-pressed={false} onClick={seat}>
          CFO
        </button>
      </>,
    );
    expect(revealFrom(["lens-fold", "lens-stress", "seat-skeptic"], 0)).toBe(3);
    expect(fold).toHaveBeenCalledTimes(1);
    expect(tab).not.toHaveBeenCalled();
    expect(seat).toHaveBeenCalledTimes(1);
    // A marker that isn't on the page yet stops there, to be tried again once the one before it opens.
    expect(revealFrom(["lens-fold", "missing", "seat-skeptic"], 0)).toBe(1);
  });

  it("waits for the target before settling for a fallback", () => {
    render(<div data-tour="lookalikes-seed">Seed</div>);
    expect(pickTarget("lookalikes-find", ["lookalikes-seed"], 0)).toBeNull();
    expect(pickTarget("lookalikes-find", ["lookalikes-seed"], FALLBACK_AFTER_MS)).toHaveTextContent("Seed");
    expect(pickTarget("lookalikes-seed", [], 0)).toHaveTextContent("Seed");
  });
});
