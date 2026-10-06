import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { handleFunctionError } from "../_shared/error-handler.ts";
import { createRateLimiter } from "../_shared/rate-limit.ts";
import { ChatInputError, criticChat, readChatInput } from "../_shared/agents/critic-chat.ts";

/**
 * Answer the critic: one of an account run's five critics replies to the
 * seller in character, grades the reply (strong, partial, misses) and asks one
 * follow-up. Public and rate-limited.
 * Input: { brief, seat, message, question?, critic: {headline, perspective}, history?: [{role, content}] }
 * Output: { reply, verdict, follow_up, model, latencyMs }. { ping: true } returns 204 (warm-up).
 */
const limited = createRateLimiter(20);

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.ping === true) return new Response(null, { status: 204, headers: corsHeaders });
    if (limited(req)) return jsonResponse({ error: "Too many replies. Try again in a minute." }, 429);
    return jsonResponse(await criticChat(readChatInput(body)));
  } catch (e) {
    if (e instanceof ChatInputError) return jsonResponse({ error: e.message }, 400);
    return handleFunctionError("critic-chat", e);
  }
});
