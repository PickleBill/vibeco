

## Plan: Create and Deploy `probe-models` Edge Function

### What
Create a diagnostic edge function that tests which AI models are available on the Lovable gateway (and optionally direct Anthropic API), reporting availability, latency, and recommendations.

### Steps

1. **Create file** `supabase/functions/probe-models/index.ts` with the exact content provided by the user
2. **Deploy** the edge function using the Supabase deploy tool
3. **Test** by invoking the function and reviewing results

### Notes
- The function tests 11 Lovable gateway models in parallel and optionally tests direct Anthropic API
- No database changes needed
- No frontend changes needed
- CORS headers are included for web access

