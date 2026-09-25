import { describe, expect, it, vi } from "vitest";
import { synthesizeCandidate } from "../../supabase/functions/_shared/agents/signal-mine";

vi.mock("../../supabase/functions/_shared/llm-client", () => ({
  callLLMWithTool: vi.fn().mockResolvedValue({
    problem: "Manual handoffs", proposed_solution: "A small shared checklist", representative_quotes: ["Handoffs need clearer ownership."],
    confidence: 60, effort: "S", evidence: { sources: ["fabricated"], source_refs: [{ url: "https://made-up.com" }] },
  }),
}));

describe("signal evidence survives synthesis", () => {
  it("preserves collected URLs and labels paraphrases without trusting model-invented evidence", async () => {
    const candidate = await synthesizeCandidate({ theme: "Handoffs", member_indices: [0, 1, 2], pain_score: 60 }, [
      { source: "hackernews", source_url: "https://news.ycombinator.com/item?id=123", title: "A handoff question", body: "Handoffs waste time", label: "pain_point", label_confidence: 0.8 },
      { source: "hackernews", source_url: "https://news.ycombinator.com/item?id=123", body: "More handoff context", label: "pain_point", label_confidence: 0.8 },
      { source: "web", source_url: "http://localhost/private", body: "Unusable source", label: "pain_point", label_confidence: 0.8 },
    ], "operations");
    expect(candidate.evidence.sources).toEqual(["hackernews", "web"]);
    expect(candidate.evidence.source_refs).toHaveLength(1);
    expect(candidate.evidence.source_refs?.[0].url).toBe("https://news.ycombinator.com/item?id=123");
    expect(candidate.evidence.source_refs?.[0].title).toBe("A handoff question");
    expect(candidate.evidence.quotes_are_paraphrases).toBe(true);
    expect(JSON.stringify(candidate.evidence)).not.toContain("made-up.com");
  });
});
