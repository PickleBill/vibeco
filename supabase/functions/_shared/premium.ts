import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Premium gate — server-side enforcement for the GPT-5.5 "premium reasoning"
 * toggle. The client may *request* premium, but only callers who actually hold
 * the `admin` or `premium` role get it. A spoofed `premium: true` from a
 * non-privileged (or anonymous) session is silently ignored.
 *
 * Resolution flow:
 *   1. No premium requested  → false (cheap default path).
 *   2. No / invalid JWT       → false.
 *   3. JWT resolves to a user with role admin|premium → true.
 *   4. Anything else          → false.
 */

export async function callerHasPremium(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return false;

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return false;

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return false;

    const { data: roles, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (roleErr) return false;

    const held = new Set((roles || []).map((r: { role: string }) => r.role));
    return held.has("admin") || held.has("premium");
  } catch {
    return false;
  }
}

/**
 * Resolve the effective premium flag for a request: honor the client's request
 * only if the caller is actually privileged.
 */
export async function resolvePremium(
  req: Request,
  requested: boolean | undefined,
): Promise<boolean> {
  if (!requested) return false;
  return await callerHasPremium(req);
}
