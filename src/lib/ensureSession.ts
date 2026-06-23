import { supabase } from "@/integrations/supabase/client";

/**
 * Ensures there is always a Supabase auth session for the current visitor.
 * Public, no-forced-login tool: if nobody is signed in, we mint an anonymous
 * session so every visitor gets a private `auth.uid()` that owns their rows
 * (and survives refresh). Returns the user id, or null if sign-in failed.
 *
 * Deduplicates concurrent calls so a burst of writes on first load doesn't
 * trigger multiple anonymous sign-ins.
 */
let pending: Promise<string | null> | null = null;

export async function ensureSession(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;

  if (!pending) {
    pending = supabase.auth
      .signInAnonymously()
      .then(({ data, error }) => {
        if (error) {
          console.error("Anonymous sign-in failed:", error.message);
          return null;
        }
        return data.user?.id ?? null;
      })
      .catch((err) => {
        console.error("Anonymous sign-in threw:", err);
        return null;
      })
      .finally(() => {
        pending = null;
      });
  }

  return pending;
}
