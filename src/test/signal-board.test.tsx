import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignalBoard from "@/pages/SignalBoard";
const mock = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/lib/invokeAI", () => ({ invokeAI: mock.invoke }));
vi.mock("@/lib/workbench", () => ({ downloadText: vi.fn() }));
vi.mock("@/lib/localPreview", () => ({ isLocalPreview: false }));
vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    message: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  }),
}));
function start() {
  render(
    <MemoryRouter>
      <SignalBoard />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Industry, niche, or topic"), {
    target: { value: "partner onboarding" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Scan this" }));
}
beforeEach(() => vi.clearAllMocks());
describe("Signal scan result states", () => {
  it("keeps the previous board on collection failure and makes failure explicit", async () => {
    mock.invoke.mockResolvedValueOnce({
      data: null,
      error: new Error("Collection timed out"),
    });
    start();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "previous board is unchanged",
    );
    expect(
      screen.getAllByText("No proof of a hole-in-one").length,
    ).toBeGreaterThan(0);
    expect(mock.invoke).toHaveBeenCalledTimes(1);
  });
  it("clears sample results when a real scan completes with no candidates", async () => {
    mock.invoke
      .mockResolvedValueOnce({ data: { items: [], collected: 0 }, error: null })
      .mockResolvedValueOnce({
        data: {
          candidates: [],
          counts: { collected: 0, pain: 0, clusters: 0, candidates: 0 },
        },
        error: null,
      });
    start();
    expect(
      await screen.findByRole("button", { name: "Download this scan" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No proof of a hole-in-one"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Results for “partner onboarding”/),
    ).toBeInTheDocument();
  });
  it("shows partial coverage and real source links while retaining useful results", async () => {
    mock.invoke
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              source: "web",
              source_url: "https://example.com/evidence",
              body: "Documented friction in partner onboarding",
            },
          ],
          collected: 1,
          warnings: ["Web collection timed out; other sources completed."],
          partial: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          candidates: [
            {
              cluster_theme: "Onboarding gap",
              problem: "Manual handoffs delay onboarding",
              proposed_solution: "Test a shared checklist",
              representative_quotes: ["Handoffs take too long"],
              pain_score: 60,
              confidence: 50,
              effort: "S",
              evidence: {
                member_count: 1,
                sources: ["web"],
                source_refs: [
                  {
                    url: "https://example.com/evidence",
                    title: "Supporting discussion",
                    source: "web",
                  },
                ],
              },
            },
          ],
          counts: { collected: 1, pain: 1, clusters: 1, candidates: 1 },
        },
        error: null,
      });
    start();
    expect(await screen.findByLabelText("Scan limitations")).toHaveTextContent(
      "Web collection timed out",
    );
    expect(
      screen.getByRole("link", { name: /Supporting discussion/ }),
    ).toHaveAttribute("href", "https://example.com/evidence");
    expect(mock.invoke.mock.calls[1][1].body).toMatchObject({
      persist: false,
      product_context: expect.stringContaining("partner onboarding"),
      items: [
        expect.objectContaining({ source_url: "https://example.com/evidence" }),
      ],
    });
  });
});
