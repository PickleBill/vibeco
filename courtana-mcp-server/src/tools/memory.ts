import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Memory tools — shared organizational memory across Claude Code sessions.
 *
 * When Session A makes an architectural decision, it writes it here.
 * Session B can query decisions and learn from them.
 * This is how the AI ecosystem compounds knowledge instead of starting from zero.
 */

export interface Decision {
  session_id?: string;
  project?: string;
  category?: string; // 'architecture', 'design', 'strategy', 'pattern', 'insight'
  title: string;
  content: string;
}

// ─── Write ───

export async function saveDecision(supabase: SupabaseClient, decision: Decision) {
  const { data, error } = await supabase
    .from("org_decisions")
    .insert({
      session_id: decision.session_id || "unknown",
      project: decision.project || "general",
      category: decision.category || "insight",
      title: decision.title,
      content: decision.content,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save decision: ${error.message}`);
  return data;
}

// ─── Read ───

export async function getDecisions(
  supabase: SupabaseClient,
  filters?: { project?: string; category?: string; limit?: number },
) {
  let query = supabase
    .from("org_decisions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit || 20);

  if (filters?.project) {
    query = query.eq("project", filters.project);
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch decisions: ${error.message}`);
  return data || [];
}
