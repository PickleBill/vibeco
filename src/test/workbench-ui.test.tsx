import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { isolatedFetch } from "@/lib/localPreview";
import { parseGeneralReport } from "../../supabase/functions/_shared/workbench-types";
import { workbenchExamples } from "@/data/workbenchExamples";
import { reportMarkdown } from "@/lib/workbench";
import { clearBrowserDrafts } from "@/lib/browserDrafts";
import GeneralWorkbench from "@/components/workbench/GeneralWorkbench";

const backend = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
  single: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: backend.getSession },
    functions: { invoke: backend.invoke },
    from: () => ({
      update: backend.update,
      insert: backend.insert,
      select: () => ({ eq: () => ({ single: backend.read }) }),
    }),
  },
}));
vi.mock("@/lib/ensureSession", () => ({
  ensureSession: vi.fn(async () => "guest-uid"),
}));
vi.mock("@/lib/localPreview", async (original) => ({
  ...(await original<typeof import("@/lib/localPreview")>()),
  isLocalPreview: false,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function open() {
  render(
    <MemoryRouter>
      <GeneralWorkbench
        purpose="decision"
        initialQuestion="Should we fix onboarding or add a feature?"
      />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  backend.getSession.mockResolvedValue({
    data: { session: { user: { id: "member", is_anonymous: false } } },
  });
  backend.single.mockResolvedValue({
    data: null,
    error: new Error("database unavailable"),
  });
  backend.insert.mockReturnValue({
    select: () => ({ single: backend.single }),
  });
  backend.update.mockReturnValue({
    eq: () => ({ select: () => ({ single: backend.single }) }),
  });
});

describe("real workbench contracts", () => {
  it("all prepared general examples pass the same runtime schema as live reports", () => {
    for (const report of Object.values(workbenchExamples))
      expect(parseGeneralReport(report)).toEqual(report);
  });
  it("export preserves citations, source dates, uncertainty and synthetic perspective labels", () => {
    const md = reportMarkdown(workbenchExamples.research);
    expect(md).toContain("Synthetic perspectives");
    expect(md).toContain("github.com/PickleBill/vibeco");
    expect(md).toContain("2026-09-25");
    expect(md).toContain("Assumptions");
    expect(md).toContain("Limits");
  });
  it("blocks read and write backend requests before any transport in local preview", async () => {
    const transport = vi.fn();
    const fetcher = isolatedFetch(true, transport);
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      const result = await fetcher(
        "https://backend.example/functions/v1/workbench",
        { method },
      );
      expect(result.status).toBe(503);
    }
    expect(transport).not.toHaveBeenCalled();
  });
  it("does not invoke AI merely by entering a starter or opening an example", () => {
    render(
      <MemoryRouter>
        <GeneralWorkbench
          purpose="research"
          example={workbenchExamples.research}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Before the pitch, understand the evidence."),
    ).toBeInTheDocument();
    expect(backend.invoke).not.toHaveBeenCalled();
  });
  it("keeps the question and returns an actionable error when an analysis fails", async () => {
    backend.invoke.mockResolvedValue({
      data: null,
      error: new Error("Provider timed out. Try again."),
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Think it through" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Provider timed out",
    );
    expect(screen.getByLabelText("Your question")).toHaveValue(
      "Should we fix onboarding or add a feature?",
    );
  });
  it("shows a complete report after explicit analysis, and never calls a failed save successful", async () => {
    backend.invoke.mockResolvedValue({
      data: { report: workbenchExamples.decision },
      error: null,
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Think it through" }));
    await screen.findByText("Turn the disagreement into a test.");
    fireEvent.click(screen.getByRole("button", { name: "Save privately" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not saved");
    expect(
      screen.queryByRole("button", { name: "Saved privately" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("vibeco_general_draft")).toContain(
      "Turn the disagreement",
    );
  });
  it("does not replace a useful prior report when refinement fails", async () => {
    backend.invoke
      .mockResolvedValueOnce({
        data: { report: workbenchExamples.decision },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error("Usage limit reached. Your report is preserved."),
      });
    open();
    fireEvent.click(screen.getByRole("button", { name: "Think it through" }));
    await screen.findByText("Turn the disagreement into a test.");
    fireEvent.change(
      screen.getByLabelText(
        "What would you challenge, change, or explore further?",
      ),
      { target: { value: "Challenge this recommendation" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refine this analysis" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Usage limit"),
    );
    expect(
      screen.getByText("Turn the disagreement into a test."),
    ).toBeInTheDocument();
  });
  it("clears private browser work across account boundaries without deleting unrelated storage", () => {
    localStorage.setItem("vibeco_general_draft", "private");
    sessionStorage.setItem("vibeco_alt_prompts_123", "private");
    localStorage.setItem("sb-auth-token", "session");
    clearBrowserDrafts();
    expect(localStorage.getItem("vibeco_general_draft")).toBeNull();
    expect(sessionStorage.getItem("vibeco_alt_prompts_123")).toBeNull();
    expect(localStorage.getItem("sb-auth-token")).toBe("session");
  });
});

function RouteLocation() {
  return <output aria-label="Current address">{useLocation().search}</output>;
}
describe("saved general reports", () => {
  it("updates the URL only after a confirmed save so refresh reopens the stored report", async () => {
    backend.invoke.mockResolvedValue({
      data: { report: workbenchExamples.decision },
      error: null,
    });
    backend.single.mockResolvedValue({
      data: { id: "saved-report" },
      error: null,
    });
    render(
      <MemoryRouter>
        <GeneralWorkbench
          purpose="decision"
          initialQuestion="Which option should we choose next?"
        />
        <RouteLocation />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Think it through" }));
    await screen.findByText("Turn the disagreement into a test.");
    fireEvent.click(screen.getByRole("button", { name: "Save privately" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Current address")).toHaveTextContent(
        "?id=saved-report",
      ),
    );
    expect(
      screen.getByRole("button", { name: "Saved privately" }),
    ).toBeInTheDocument();
  });
  it("reopens the versioned saved report without an AI request and keeps enabled sharing visible", async () => {
    backend.read.mockResolvedValue({
      data: {
        general_report: workbenchExamples.decision,
        sharing_enabled: true,
      },
      error: null,
    });
    render(
      <MemoryRouter>
        <GeneralWorkbench purpose="decision" resumeId="saved-report" />
      </MemoryRouter>,
    );
    await screen.findByText("Turn the disagreement into a test.");
    expect(
      screen.getByRole("button", { name: "Revoke share link" }),
    ).toBeInTheDocument();
    expect(backend.invoke).not.toHaveBeenCalled();
  });
});
