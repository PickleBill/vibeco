import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { LLMError } from "../_shared/error-handler.ts";
import { callLLM } from "../_shared/llm-client.ts";
import { routedModels } from "../_shared/model-router.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { cleanCompany, runAccountResearch, runSimulation } from "../_shared/agents/simulate.ts";

/**
 * Model diagnostics. Reports:
 * - which models the Lovable gateway serves today (its own list),
 * - whether each model the router uses answers, and whether it returns a tool
 *   call (every agent depends on tool calling), with latency,
 * - other top-tier models the gateway serves, tested the same way,
 * - whether the direct Anthropic fallback works.
 * Each probe spends a handful of tokens, so it's rate-limited.
 *
 * - compare mode: one account's research, then the real account brief on each
 *   of up to four gateway models, side by side (time, motion, evidence checks,
 *   the plan itself), so model choices rest on real output.
 *
 * Input:  {} or { models: ["anthropic/claude-…"] } to test extra gateway models,
 *         or { compare: { company: "Bandwidth (bandwidth.com)", models: [...] } }.
 */
const limited = createRateLimiter(3);
const MAX_PROBES = 32;

const PROBE_TOOL = {
  type: "function" as const,
  function: {
    name: "answer",
    description: "Return one word.",
    parameters: { type: "object", properties: { word: { type: "string" } }, required: ["word"], additionalProperties: false },
  },
};

/** The gateway names the models it serves when asked for one it doesn't. */
async function gatewayModels(): Promise<string[]> {
  try {
    await callLLM({ model: "probe/list-models", messages: [{ role: "user", content: "hi" }], maxTokens: 5 });
  } catch (e) {
    const body = e instanceof LLMError ? e.body : "";
    const list = /allowed models:\s*\[([^\]]*)\]/i.exec(body)?.[1] ?? "";
    return list.split(/[\s,]+/).map((m) => m.replace(/["']/g, "")).filter((m) => /^[a-z0-9-]+\/[\w.:-]+$/i.test(m));
  }
  return [];
}

async function probe(model: string) {
  const t0 = Date.now();
  try {
    const res = await callLLM({
      model,
      messages: [{ role: "user", content: "Call the answer tool with the word 'working'." }],
      tools: [PROBE_TOOL],
      toolChoice: { type: "function", function: { name: "answer" } },
      // Room for reasoning models to think before they call the tool.
      maxTokens: 800,
    });
    const word = res.toolCalls?.[0]?.arguments?.word;
    return { model, ok: true, tool_call: typeof word === "string", latency_ms: Date.now() - t0 };
  } catch (e) {
    return {
      model,
      ok: false,
      tool_call: false,
      latency_ms: Date.now() - t0,
      status: e instanceof LLMError ? e.status : 0,
      error: (e instanceof LLMError ? e.body : String(e)).slice(0, 300),
    };
  }
}

async function anthropicDirect() {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) return { configured: false, ok: false, note: "No ANTHROPIC_API_KEY secret set." };
  try {
    await callLLM({ gateway: "anthropic-direct", model: "anthropic/claude-haiku-4-5", messages: [{ role: "user", content: "Say ok." }], maxTokens: 5 });
    return { configured: true, ok: true };
  } catch (e) {
    const text = e instanceof LLMError ? e.body : String(e);
    return {
      configured: true,
      ok: false,
      error: text.slice(0, 300),
      ...(/credit balance/i.test(text)
        ? { note: "The key works but the Anthropic account has no credits. Claude models still run through the Lovable gateway's Messages endpoint." }
        : {}),
    };
  }
}

/** The real account brief for one company on each model, side by side. */
async function compareOnAccount(typed: string, models: string[]) {
  const t0 = Date.now();
  const { research, excerpts, timing } = await runAccountResearch(typed);
  const research_ms = Date.now() - t0;
  const runs = await Promise.all(
    models.map(async (model) => {
      const t = Date.now();
      try {
        const result = await runSimulation(
          { type: "initial", lens: "account", idea: typed, seller: "omni", research, excerpts, mode: "fast" },
          { models: [model] },
        );
        const brief = result.brief as unknown as Record<string, unknown>;
        const stack = (brief.core_features ?? []) as { status: string; downgraded?: boolean }[];
        const motion = (brief.motion ?? {}) as { label?: string };
        const plan = result.lovable_prompt ?? "";
        return {
          model,
          ok: true,
          ms: Date.now() - t,
          motion: motion.label,
          fit: brief.fit,
          stack: {
            confirmed: stack.filter((l) => l.status === "Confirmed").length,
            inferred: stack.filter((l) => l.status === "Inferred").length,
            downgraded: stack.filter((l) => l.downgraded).length,
          },
          off_topic: ((brief.research as { sources?: { off_topic?: boolean }[] })?.sources ?? []).filter((x) => x.off_topic).length,
          people: ((brief.people ?? []) as unknown[]).length,
          questions: ((brief.discovery_questions ?? []) as unknown[]).length,
          plan_words: plan.split(/\s+/).filter(Boolean).length,
          plan,
        };
      } catch (e) {
        return { model, ok: false, ms: Date.now() - t, error: (e instanceof LLMError ? e.body : String(e)).slice(0, 300) };
      }
    }),
  );
  return { company: typed, research: { ms: research_ms, provider: research.provider, sources: research.sources.length, lanes: timing.lanes }, runs };
}

// Top-tier models worth comparing against what the router uses today.
const NOTABLE = /^(anthropic\/claude-(?:opus|sonnet|fable|haiku)|openai\/gpt-5|google\/gemini-3)/i;

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  if (limited(req)) return jsonResponse({ error: "Too many probes. Try again in a minute." }, 429);
  if (!Deno.env.get("LOVABLE_API_KEY")) return jsonResponse({ error: "LOVABLE_API_KEY is not set." }, 500);

  const body = await req.json().catch(() => ({}));
  const routed = routedModels();
  const allowed = await gatewayModels();

  if (body?.compare) {
    const typed = cleanCompany(body.compare.company);
    const models = (Array.isArray(body.compare.models) ? body.compare.models : [])
      .filter((m: unknown): m is string => typeof m === "string" && allowed.includes(m))
      .slice(0, 4);
    if (!typed || !models.length) return jsonResponse({ error: "compare needs a company and 1-4 models from the gateway's list." }, 400);
    return jsonResponse(await compareOnAccount(typed, models));
  }
  const inRouter = [...new Set(routed.flatMap((r) => r.models))].filter((m) => !/image/.test(m));
  const requested = Array.isArray(body?.models) ? body.models.filter((m: unknown) => typeof m === "string" && allowed.includes(m)) : [];
  const notable = allowed.filter((m) => NOTABLE.test(m) && !/image|tts|audio|embed/i.test(m));
  const toProbe = [...new Set([...inRouter, ...requested, ...notable])].slice(0, MAX_PROBES);

  const [results, direct] = await Promise.all([Promise.all(toProbe.map(probe)), anthropicDirect()]);
  const byModel = new Map(results.map((r) => [r.model, r]));
  const broken = routed
    .map((r) => ({ task: r.task, unavailable: r.models.filter((m) => byModel.get(m) && !byModel.get(m)!.ok) }))
    .filter((r) => r.unavailable.length);

  return jsonResponse({
    gateway: { allowed_models: allowed, results },
    router: { tasks: routed, unavailable: broken },
    anthropic_direct: direct,
    summary: {
      tested: results.length,
      working: results.filter((r) => r.ok).map((r) => r.model),
      tool_calling: results.filter((r) => r.tool_call).map((r) => r.model),
      router_models_down: [...new Set(broken.flatMap((b) => b.unavailable))],
    },
  });
});
