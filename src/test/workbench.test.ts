import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import { parseGeneralReport, parseWorkbenchRequest, publicSourceUrl, type GeneralPurpose, type GeneralReport } from "../../supabase/functions/_shared/workbench-types";
import { collectWorkbenchEvidence } from "../../supabase/functions/_shared/workbench-evidence";
import { runWorkbench, type WorkbenchDependencies } from "../../supabase/functions/_shared/agents/workbench";
import type { DebateResult } from "../../supabase/functions/_shared/agents/debate";

// Edge modules are imported by these pure mocked tests; no Deno server or API is invoked.
declare global { const Deno: { env: { get(name: string): string | undefined } }; }
const source = { id: "s_official", url: "https://www.acme.com/company", title: "Acme company", retrievedAt: "2026-09-25T12:00:00.000Z", excerpt: "Acme supports partnerships." };
const draft = {
  title: "A bounded next step", summary: "Compare a pilot with waiting.", recommendation: "Run a small reversible pilot.",
  facts: [{ text: "Acme supports partnerships.", sourceIds: [source.id], origin: "source" as const }],
  assumptions: ["Decision makers are available."], openQuestions: ["Who owns the outcome?"], tensions: ["Speed versus evidence."],
  alternatives: ["Defer until constraints are clear."], nextActions: ["Confirm the decision owner."], handoffPrompt: "Assess the pilot using the supplied source, and mark remaining unknowns.", limitations: [],
};
const perspectives = ["evidence reviewer", "challenger", "pragmatist"].map((name) => ({ name, position: "Investigate before committing.", rationale: "Missing evidence.", synthetic: true as const }));
function fixture(purpose: GeneralPurpose = "research"): GeneralReport {
  return { ...draft, schemaVersion: 2, purpose, question: "Should we explore a partnership?", sources: [source], perspectives };
}
function debateFixture(count = 3): DebateResult {
  return {
    topic: "Should we explore a partnership?", timing: {},
    perspectives: perspectives.slice(0, count).map((p) => ({ persona: p.name, position: p.position, key_points: [p.rationale], questions: ["What would change your mind?"], confidence: "high" as const })),
    synthesis: { executive_summary: "Investigate.", consensus: [], tensions: [], recommendation: "proceed-with-caution", rationale: "Evidence is incomplete.", next_actions: ["Ask."], confidence_score: 99 },
  };
}
function deps(overrides: Partial<WorkbenchDependencies> = {}): WorkbenchDependencies {
  return { collect: vi.fn().mockResolvedValue({ sources: [source], documents: [{ sourceId: source.id, content: source.excerpt }], limitations: [] }), debate: vi.fn().mockResolvedValue(debateFixture()), complete: vi.fn().mockResolvedValue(draft), ...overrides };
}

beforeEach(() => { vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("TextEncoder", TextEncoder); vi.stubGlobal("TextDecoder", TextDecoder); });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("workbench contract and compatibility", () => {
  it.each(["research", "initiative", "decision"] as const)("round-trips a versioned %s report without a build schema", (purpose) => {
    expect(parseGeneralReport(fixture(purpose))).toEqual(fixture(purpose));
  });
  it("rejects unsupported versions and malformed reports instead of silently converting legacy data", () => {
    expect(() => parseGeneralReport({ ...fixture(), schemaVersion: 1 })).toThrow("Unsupported");
    expect(() => parseGeneralReport({ ...fixture(), nextActions: "pretend list" })).toThrow();
    expect(() => parseGeneralReport({ ...fixture(), perspectives: [{ ...perspectives[0], synthetic: false }] })).toThrow("synthetic");
  });
  it("rejects invented citations and uncited source claims", () => {
    expect(() => parseGeneralReport({ ...fixture(), facts: [{ text: "Invented claim", sourceIds: ["fictional"], origin: "source" }] })).toThrow("unavailable source");
    expect(() => parseGeneralReport({ ...fixture(), facts: [{ text: "Uncited claim", sourceIds: [], origin: "source" }] })).toThrow("distinguish");
    expect(parseGeneralReport({ ...fixture(), facts: [{ text: "User says the team is divided.", sourceIds: [], origin: "user" }] }).facts[0].origin).toBe("user");
  });
  it("requires a complete refinement without changing the report purpose", () => {
    expect(() => parseWorkbenchRequest({ action: "refine", purpose: "research", question: fixture().question })).toThrow("previous report");
    expect(() => parseWorkbenchRequest({ action: "refine", purpose: "decision", question: fixture().question, priorReport: fixture(), refinement: "Simplify" })).toThrow("original report");
    expect(parseWorkbenchRequest({ action: "refine", purpose: "research", question: fixture().question, priorReport: fixture(), refinement: "Simplify" }).priorReport?.sources).toEqual([source]);
  });
  it.each(["http://127.0.0.1", "http://2130706433", "http://[::1]/", "http://169.254.169.254", "http://metadata.google.internal", "http://localhost", "http://intranet", "http://service.local", "https://public.com:8443", "https://user:secret@public.com", "file:///etc/passwd", "javascript:alert(1)", "https://127.0.0.1.nip.io"])("rejects unsafe source %s", (url) => {
    expect(() => publicSourceUrl(url)).toThrow();
  });
  it("normalizes public links and caps input before provider execution", () => {
    expect(publicSourceUrl("https://www.acme.com/company#section")).toBe("https://www.acme.com/company");
    expect(() => parseWorkbenchRequest({ action: "analyze", purpose: "research", question: "Research Acme", sourceUrls: Array(6).fill(source.url) })).toThrow("at most 5");
  });
});

describe("evidence collection", () => {
  it("retains provider URLs/titles/times and stable IDs while removing duplicates", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ success: true, data: { web: [
      { url: source.url, title: source.title, markdown: source.excerpt }, { url: `${source.url}#anchor`, markdown: source.excerpt },
      { url: "http://localhost/private", markdown: "private" },
    ] } }), { status: 200 }));
    const input = { action: "analyze" as const, purpose: "research" as const, question: "Research Acme" };
    const options = { apiKey: "test", fetcher, now: () => new Date(source.retrievedAt) };
    const first = await collectWorkbenchEvidence(input, options);
    const second = await collectWorkbenchEvidence(input, options);
    expect(first.sources).toHaveLength(1);
    expect(first.sources[0]).toMatchObject({ url: source.url, title: source.title, retrievedAt: source.retrievedAt });
    expect(first.sources[0].id).toBe(second.sources[0].id);
    expect(first.documents[0].sourceId).toBe(first.sources[0].id);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.firecrawl.dev/v2/search");
    expect(fetcher.mock.calls[0][1].redirect).toBe("error");
  });
  it("re-fetches prior source URLs instead of treating client excerpts as evidence", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { markdown: "Newly collected content.", metadata: { title: "Fresh page", sourceURL: source.url } } })));
    const result = await collectWorkbenchEvidence({ action: "refine", purpose: "research", question: fixture().question, priorReport: fixture(), refinement: "Update" }, { apiKey: "test", fetcher });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.firecrawl.dev/v2/scrape");
    expect(result.documents[0].content).toBe("Newly collected content.");
  });
  it("reports unavailable research without inventing sources", async () => {
    const result = await collectWorkbenchEvidence({ action: "analyze", purpose: "research", question: "Research Acme" }, {});
    expect(result.sources).toEqual([]);
    expect(result.limitations.join(" ")).toContain("not verified");
  });
  it("records provider failures, empty pages, and partial retrieval", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("Network down"));
    const result = await collectWorkbenchEvidence({ action: "analyze", purpose: "research", question: "Research Acme", sourceUrls: [source.url] }, { apiKey: "test", fetcher });
    expect(result.sources).toEqual([]);
    expect(result.limitations.join(" ")).toContain("Could not retrieve");
  });
});

describe("purpose-aware agent", () => {
  it.each(["research", "initiative", "decision"] as const)("uses the shared debate with purpose-appropriate %s guidance", async (purpose) => {
    const mocks = deps();
    const report = await runWorkbench({ action: "analyze", purpose, question: fixture().question }, mocks);
    expect(report.purpose).toBe(purpose);
    expect(report.schemaVersion).toBe(2);
    expect(report.perspectives.every((p) => p.synthetic)).toBe(true);
    expect(report.sources).toEqual([source]);
    expect(report).not.toHaveProperty("confidence_score");
    expect(JSON.stringify(vi.mocked(mocks.debate).mock.calls)).toContain("not a real interviewee");
    const outputPrompt = vi.mocked(mocks.complete).mock.calls[0][0].messages[0].content;
    if (purpose === "decision") expect(outputPrompt).toContain("another person's motives");
    if (purpose === "initiative") expect(outputPrompt).toContain("bounded experiment");
    if (purpose === "research") expect(outputPrompt).toContain("dated source observations");
  });
  it("discloses partial perspectives and ignores model attempts to change source metadata", async () => {
    const report = await runWorkbench({ action: "analyze", purpose: "research", question: fixture().question }, deps({ debate: vi.fn().mockResolvedValue(debateFixture(2)), complete: vi.fn().mockResolvedValue({ ...draft, sources: [{ url: "https://invented.com" }], question: "Fake question" }) }));
    expect(report.sources).toEqual([source]);
    expect(report.question).toBe(fixture().question);
    expect(report.limitations.join(" ")).toContain("did not complete");
  });
  it("rejects malformed model output or hallucinated citations rather than returning success", async () => {
    await expect(runWorkbench({ action: "analyze", purpose: "research", question: fixture().question }, deps({ complete: vi.fn().mockResolvedValue({ ...draft, facts: [{ text: "Not sourced", sourceIds: ["made-up"], origin: "source" }] }) }))).rejects.toThrow("unsupported citation");
  });
  it("stops on debate failure and never fabricates a completed report", async () => {
    const mocks = deps({ debate: vi.fn().mockRejectedValue(new Error("Provider unavailable")) });
    await expect(runWorkbench({ action: "analyze", purpose: "research", question: fixture().question }, mocks)).rejects.toThrow("Provider unavailable");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("ends a stalled analysis with a clear retry error", async () => {
    vi.useFakeTimers();
    const work = runWorkbench({ action: "analyze", purpose: "research", question: fixture().question }, deps({ debate: () => new Promise(() => undefined) }));
    const checked = expect(work).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(78_001);
    await checked;
  });
});
