import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { LLMError } from "../_shared/error-handler.ts";
import { callLLM } from "../_shared/llm-client.ts";
import { routedModels } from "../_shared/model-router.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";

/**
 * Model diagnostics. Reports:
 * - which models the Lovable gateway serves today (its own list),
 * - whether each model the router uses answers, and whether it returns a tool
 *   call (every agent depends on tool calling), with latency,
 * - other top-tier models the gateway serves, tested the same way,
 * - whether the direct Anthropic fallback works.
 * Each probe spends a handful of tokens, so it's rate-limited.
 *
 * Input:  {} or { models: ["anthropic/claude-…"] } to test extra gateway models.
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
      maxTokens: 60,
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
      ...(/credit balance/i.test(text) ? { note: "The key works but the Anthropic account has no credits. Claude is still reachable through the Lovable gateway." } : {}),
    };
  }
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
