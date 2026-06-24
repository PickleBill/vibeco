import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "moderator" | "user" | "premium";

interface UserRoleState {
  roles: AppRole[];
  isAdmin: boolean;
  isPremium: boolean; // admin OR premium — i.e. may use premium reasoning
  loading: boolean;
}

/**
 * Reads the signed-in user's roles from `user_roles`. Used to gate premium-only
 * affordances (e.g. the GPT-5.5 reasoning toggle). The server independently
 * re-verifies the role, so this is purely for UI visibility.
 */
export function useUserRole(): UserRoleState {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(userId: string | null) {
      if (!userId) {
        if (active) {
          setRoles([]);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!active) return;
      if (error) {
        setRoles([]);
      } else {
        setRoles((data || []).map((r: { role: AppRole }) => r.role));
      }
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      load(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoading(true);
      load(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isPremium = isAdmin || roles.includes("premium");

  return { roles, isAdmin, isPremium, loading };
}
