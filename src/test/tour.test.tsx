import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { getSeller } from "@/lib/sellers";
import { HowItWorksButton, TourHost } from "@/components/territory/tour/TourHost";
import { markWelcomeSeen, resetTour, welcomeSeen } from "@/components/territory/tour/store";

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
    expect(screen.getByText("Unofficial. Not affiliated with Omni.")).toBeInTheDocument();
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
  it("?tour starts at step 1 on the demo account's run", () => {
    page("/for/omni/lookalikes?tour");
    expect(welcome()).not.toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Run an account" })).toBeInTheDocument();
    expect(screen.getByText(/^Relay’s saved run: the three whys, seven agents/)).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(new RegExp(`^/for/omni/account/${relay}$`));
    // Focus lands on the default button.
    expect(screen.getByRole("button", { name: /^Next/ })).toHaveFocus();
  });

  it("Next walks run, radar, lookalikes and committee on the territory's first account, never the Deal Room", () => {
    page("/for/omni?tour");
    expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/account/${relay}`);
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/for\/omni\/radar$/);

    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/lookalikes/${relay}`);

    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(screen.getByRole("heading", { name: "Committee for Relay" })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/committee/${relay}`);

    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent(`/for/omni/lookalikes/${relay}`);
  });

  it("ends with a card that sends you to run your own account", () => {
    page("/for/omni?tour");
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
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
    expect(screen.queryByText("1 of 4")).not.toBeInTheDocument();
    expect(tourCard()).not.toBeInTheDocument();
  });

  it("starts from the welcome card", () => {
    page();
    fireEvent.click(screen.getByRole("button", { name: "How it works" }));
    fireEvent.click(screen.getByRole("button", { name: /Demo in 60 seconds/ }));
    expect(welcome()).not.toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });
});
