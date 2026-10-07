import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { AccountAnalysis } from "@/components/account/explorer/model";
import { readCommittee } from "@/components/territory/committee/model";
import { qualify, threeWhys, tidy } from "@/components/territory/qualification/model";
import { QualificationCard } from "@/components/territory/qualification/QualificationCard";
import relay from "./fixtures/relay-run.json";

const brief = { ...(relay.brief as AccountBrief), company: "Relay" };
const analysis = relay.analysis as AccountAnalysis;
const meeting = readCommittee(relay.committee);

describe("qualify (MEDDPICC from a saved run)", () => {
  it("reads Relay's run the way a deal review would", () => {
    const q = qualify(brief, analysis, meeting);
    const by = Object.fromEntries(q.rows.map((r) => [r.id, r]));
    expect(q.rows.map((r) => r.letter).join("")).toBe("MEDDPICC");
    expect(by.competition.status).toBe("Confirmed");
    expect(by.competition.evidence).toContain("Metabase [1]");
    expect(by.pain.status).toBe("Inferred");
    expect(by.pain.evidence).toMatch(/agree without manual SQL/);
    expect(by.champion.status).toBe("Inferred");
    expect(by.champion.evidence).toMatch(/Head of Data sponsors/);
    expect(by.champion.evidence).toMatch(/Director, Customer Success Enablement/);
    expect(by.economic_buyer.status).toBe("Gap");
    expect(by.economic_buyer.evidence).toMatch(/CFO carries the most weight/);
    for (const id of ["metrics", "decision_criteria", "decision_process", "paper_process"]) expect(by[id].status).toBe("Gap");
    expect(q.known).toBe(3);
    expect(q.gaps).toBe(5);
    expect(q.biggest?.id).toBe("economic_buyer");
    // Every row says how to close it.
    for (const r of q.rows) expect(r.next.length).toBeGreaterThan(10);
  });

  it("never turns a gap into a known without a meeting, and still names where to start", () => {
    const q = qualify(brief, analysis, null);
    const by = Object.fromEntries(q.rows.map((r) => [r.id, r]));
    expect(q.fromMeeting).toBe(false);
    expect(by.economic_buyer.evidence).toBe("Not named in the sources.");
    expect(by.champion.evidence).toMatch(/^Start with: Director, Customer Success Enablement\.$/);
    expect(by.pain.simulated).toBeFalsy();
    expect(q.rows.some((r) => r.simulated)).toBe(false);
  });

  it("is all gaps on an empty brief, with no crash", () => {
    const q = qualify({}, null, null);
    expect(q.known).toBe(0);
    expect(q.gaps).toBe(8);
  });

  it("ends a cut-short committee line on a whole clause", () => {
    expect(tidy("No way to verify a delivery rate [2] [3]…")).toBe("No way to verify a delivery rate [2] [3]");
    expect(tidy("Whole sentence.")).toBe("Whole sentence.");
  });
});

describe("threeWhys", () => {
  it("takes change from the business user, now from the freshest dated trigger, the seller's why from Distill", () => {
    const w = threeWhys(brief, analysis, meeting);
    expect(w.change).toMatch(/agree without manual SQL/);
    expect(w.now?.date).toBe("2026-09");
    expect(w.now?.text).toMatch(/\$36 million/);
    expect(w.omni).toMatch(/embedded analytics platform/);
  });

  it("leaves change and the seller's why empty until the agents finish", () => {
    const w = threeWhys(brief, null, null);
    expect(w.change).toBeUndefined();
    expect(w.omni).toBeUndefined();
    expect(w.now).toBeDefined();
  });
});

describe("QualificationCard", () => {
  it("is one slim bar shut (eight letters and a line), and the eight rows open", () => {
    const q = qualify(brief, analysis, meeting);
    render(<QualificationCard qualification={q} sources={[]} />);
    const bar = screen.getByRole("button", { name: /3 of 8 from public research\. The rest is discovery\./ });
    expect(bar).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByTestId("meddpicc-letter")).toHaveLength(8);
    expect(screen.queryByText(/Biggest gap/)).toBeNull();
    expect(screen.queryByText("Paper process")).not.toBeInTheDocument();
    fireEvent.click(bar);
    expect(bar).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Paper process")).toBeInTheDocument();
    expect(screen.getAllByText("Gap").length).toBeGreaterThanOrEqual(5);
  });
});
