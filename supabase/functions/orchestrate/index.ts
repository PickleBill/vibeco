import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { generatePerspective } from "../_shared/agents/persona.ts";
import { generateExpansions } from "../_shared/agents/expand.ts";
import { generateDistillation } from "../_shared/agents/distill.ts";
import { synthesize } from "../_shared/agents/synthesize.ts";
import type { PersonaType, PerspectiveResult } from "../_shared/types.ts";

/**
 * Lightweight orchestrator: "Auto-Thunderdome"
 *
 * Takes a completed brief + idea and runs all agents in parallel,
 * then synthesizes their outputs into a unified analysis.
 *
 * This is the first demonstration of agents talking to each other —
 * the synthesize agent reads all other agents' outputs and finds
 * consensus, tensions, and ranked recommendations.
 *
 * Input: { idea, brief, mode?, highlights?, antiHighlights? }
 * Output: { perspectives, expansion, distillation, synthesis, timing }
 */

const PERSONAS: PersonaType[] = ["skeptic", "champion", "competitor", "customer", "builder"];

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { idea, brief, mode, highlights, antiHighlights } = await req.json();

    if (!idea || !brief) {
      return jsonResponse({ error: "Missing required fields: idea, brief" }, 400);
    }

    const startTime = Date.now();
    const timing: Record<string, number> = {};

    // ── Phase 1: Fan-out — run all 7 agents in parallel ──
    const perspectivePromises = PERSONAS.map((persona) =>
      generatePerspective({ idea, brief, persona, mode, builder_intent: brief.builder_intent })
        .then((result) => {
          timing[`perspective-${persona}`] = Date.now() - startTime;
          return result;
        })
    );

    const expandPromise = generateExpansions({ idea, brief, mode })
      .then((result) => {
        timing["expand"] = Date.now() - startTime;
        return result;
      });

    const distillPromise = generateDistillation({ idea, brief, mode, highlights, antiHighlights })
      .then((result) => {
        timing["distill"] = Date.now() - startTime;
        return result;
      });

    // Fire all 7 at once
    const [perspectiveResults, expansion, distillation] = await Promise.all([
      Promise.allSettled(perspectivePromises),
      expandPromise,
      distillPromise,
    ]);

    // Collect successful perspectives (don't fail the whole flow if one persona errors)
    const perspectives: PerspectiveResult[] = perspectiveResults
      .filter((r): r is PromiseFulfilledResult<PerspectiveResult> => r.status === "fulfilled")
      .map((r) => r.value);

    timing["phase1-complete"] = Date.now() - startTime;

    // ── Phase 2: Synthesize — agents talk to each other ──
    const synthesis = await synthesize({
      idea,
      brief,
      perspectives,
      expansion,
      distillation,
      highlights,
      antiHighlights,
      mode,
    });

    timing["synthesis"] = Date.now() - startTime;
    timing["total"] = Date.now() - startTime;

    return jsonResponse({
      perspectives,
      expansion,
      distillation,
      synthesis,
      timing,
      agents_completed: perspectives.length + 2, // perspectives + expand + distill
      agents_total: PERSONAS.length + 2,
    });
  } catch (e) {
    return handleFunctionError("orchestrate", e);
  }
});
