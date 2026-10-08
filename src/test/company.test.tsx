import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { SavedReport } from "@/components/account/explorer/savedRuns";
import { CompanyLogo } from "@/components/territory/company/CompanyLogo";
import { CompanyName } from "@/components/territory/company/CompanyName";
import { briefFacts, firstSentence, initialsOf, logoUrl } from "@/components/territory/company/model";
import { toRow } from "@/components/territory/model";

const NOW = new Date(Date.UTC(2026, 9, 7));

function report(o: { company?: string; stack?: [string, string, string][]; whyNow?: string } = {}): SavedReport {
  const brief: AccountBrief = {
    lens: "account",
    company: o.company ?? "Acme Outfitters (acme.example)",
    account_line: "Acme sells outdoor gear and ships dashboards to its dealers [1] [2].",
    research: {
      provider: "test",
      sources: [1, 2, 3].map((id) => ({ id, title: `Source ${id}`, url: `https://example.com/${id}`, snippet: "" })),
    } as AccountBrief["research"],
    core_features: (o.stack ?? [["Warehouse", "Snowflake", "Confirmed"], ["BI tools", "Looker", "Inferred"]]).map(([name, tool, status]) => ({ name, tool, status, sources: [1], description: "" })),
    revenue_model: o.whyNow ?? "2026-09: Raised $20M [2].",
    fit: { grade: "B", motion: "Internal", reason: "A reason [1]." },
    motion: { label: "Both", internal: { sources: [], evidence: [], clock: "", buyer: "", question: "" }, embedded: { sources: [], evidence: [], clock: "", buyer: "", question: "" } },
    customer_list: { on_list: false, sentence: "" },
  };
  return { id: "acme", idea: brief.company!, brief, lovable_prompt: null, auto_analysis: null, created_at: "2026-10-06T21:00:00Z" };
}

const rowOf = (r: SavedReport) => toRow({ company: r.idea, reportId: r.id, segment: "Strategic" }, r, NOW);

describe("CompanyLogo", () => {
  it("shows initials without a domain, and the favicon tile with one", () => {
    const { container, rerender } = render(<CompanyLogo name="Guitar Center" size={28} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-logo=initials]")).toHaveAttribute("data-initials", "GC");

    rerender(<CompanyLogo name="Relay" domain="relaypro.com" size={40} />);
    const img = container.querySelector("img")!;
    // The initials hold the tile while the icon loads; neither adds to the text beside it.
    expect(container.querySelector("[data-initials]")).toHaveAttribute("data-initials", "R");
    expect(container.textContent).toBe("");
    expect(img).toHaveAttribute("src", logoUrl("relaypro.com"));
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");

    // A failed load (or the service's placeholder) falls back to initials, never a broken image.
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-logo=initials]")).toHaveAttribute("data-initials", "R");

    // A new domain gets a fresh try; a real icon replaces the initials, the 16px placeholder globe doesn't.
    rerender(<CompanyLogo name="Equifax" domain="equifax.com" size={20} />);
    const icon = container.querySelector("img")!;
    Object.defineProperty(icon, "naturalWidth", { value: 57, configurable: true });
    fireEvent.load(icon);
    expect(container.querySelector("[data-initials]")).toBeNull();
    rerender(<CompanyLogo name="Nowhere" domain="nowhere.example" size={20} />);
    const globe = container.querySelector("img")!;
    Object.defineProperty(globe, "naturalWidth", { value: 16, configurable: true });
    fireEvent.load(globe);
    expect(container.querySelector("img")).toBeNull();
  });

  it("reads initials from the name", () => {
    expect(initialsOf("Guitar Center")).toBe("GC");
    expect(initialsOf("Relay", 2)).toBe("R");
    expect(initialsOf("AvidXchange (avidxchange.com)")).toBe("A");
    expect(initialsOf("Guitar Center", 1)).toBe("G");
  });
});

describe("CompanyName and the brief", () => {
  it("opens the brief: tags, the account line, why now and the actions, nothing more", () => {
    const row = rowOf(report());
    const rowClick = vi.fn();
    render(
      <MemoryRouter>
        <div onClick={rowClick}>
          <CompanyName row={row} seller="omni" />
        </div>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Acme Outfitters" }));
    // The click stops at the name: a clickable row around it doesn't also fire.
    expect(rowClick).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog", { name: "Acme Outfitters" });
    expect(within(dialog).getByText("Acme sells outdoor gear and ships dashboards to its dealers.")).toBeInTheDocument();
    // No bare domain beside the name: one small Website link in the actions.
    expect(within(dialog).queryByText("acme.example")).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Website/ })).toHaveAttribute("href", "https://acme.example");
    expect(within(dialog).getByText("Motion: Both")).toBeInTheDocument();
    expect(within(dialog).getByText("Strategic")).toBeInTheDocument();
    expect(within(dialog).getByText("Sep 2026")).toBeInTheDocument();
    expect(within(dialog).getByText("Raised $20M.")).toBeInTheDocument();
    // The Omni status, the stack and the sources are one click away on the run.
    expect(within(dialog).queryByText(/public customer list/)).toBeNull();
    expect(within(dialog).queryByText("Snowflake")).toBeNull();
    expect(within(dialog).queryByText(/From \d+ sources?/)).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Open the run/ })).toHaveAttribute("href", "/for/omni/account/acme");
    expect(within(dialog).getByRole("link", { name: /Simulate its committee/ })).toHaveAttribute("href", "/for/omni/committee/acme");
    expect(within(dialog).getByRole("link", { name: /Find lookalikes/ })).toHaveAttribute("href", "/for/omni/lookalikes/acme");
    // The site footer says it's unofficial; the brief doesn't repeat it.
    expect(within(dialog).queryByText(/Unofficial/)).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says when there's no dated trigger, and keeps why now to one sentence", () => {
    const facts = briefFacts(rowOf(report({ whyNow: "", stack: [["BI tools", "Looker", "Inferred"]] })));
    expect(facts.why).toBeUndefined();
    expect(firstSentence("Raised $20M from U.S. Bank. The round closes in May.")).toBe("Raised $20M from U.S. Bank.");
    expect(firstSentence("Hired a CDO.")).toBe("Hired a CDO.");

    render(
      <MemoryRouter>
        <CompanyName row={rowOf(report({ whyNow: "", stack: [] }))} seller="omni" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Acme Outfitters" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No dated trigger found")).toBeInTheDocument();
  });
});
