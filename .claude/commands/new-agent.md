---
description: Scaffold a new VibeCo agent following the standard pattern
argument-hint: <agent-name>
---
Add a new agent named "$ARGUMENTS" to vibeco, following the "Adding a New Agent" convention in CLAUDE.md. Honor the project conventions: all LLM calls go through `_shared/llm-client.ts` (never raw fetch), model selection through `_shared/model-router.ts` (never hardcoded model strings), tool schemas in OpenAI function-calling format.

1. Create `supabase/functions/_shared/agents/$ARGUMENTS.ts` with the core logic — system prompt, tool schema, and main function. Mirror the structure of the existing agents in that folder.
2. Create `supabase/functions/$ARGUMENTS/index.ts` as a thin (~20-line) HTTP wrapper that imports the core logic, using `_shared/cors.ts` for CORS and `_shared/error-handler.ts` for 429/402/500 handling.
3. Add the agent's task type to `_shared/model-router.ts`.
4. Add the agent's I/O TypeScript types to `_shared/types.ts`.
5. If other agents should be able to call it, register it in the orchestrator's workflow DAG.

Show me the new/changed files and a short summary of where each piece went.
