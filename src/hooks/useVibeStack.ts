import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { isLocalPreview } from "@/lib/localPreview";
import { supabase } from "@/integrations/supabase/client";

export type StackKind = "highlight" | "deep_dive" | "expansion" | "persona" | "distill" | "note";

export interface StackItem {
  id: string;
  report_id: string;
  kind: StackKind;
  source: string | null;
  label: string;
  content: string;
  position: number;
  pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  /** Which round of the simulation this insight came from. Stored client-side
   *  in `source` as `"<round>:<source>"` when persisted, parsed back on read. */
  round?: number;
}

export interface AddItemArgs {
  kind: StackKind;
  source?: string | null;
  label: string;
  content: string;
  pinned?: boolean;
  round?: number;
}

const LOCAL_KEY = "vibeco_stack_local";

interface UseVibeStackResult {
  items: StackItem[];
  loading: boolean;
  add: (args: AddItemArgs) => Promise<StackItem | null>;
  togglePin: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
  hasItem: (kind: StackKind, source: string | null | undefined, label: string) => boolean;
}

/**
 * Hook for managing the Vibe Stack — curated insight chits attached to a report.
 * Falls back to localStorage when there is no reportId yet (e.g. mid-simulation).
 */
export function useVibeStack(reportId: string | null | undefined, options: { ephemeral?: boolean; localScope?: string } = {}): UseVibeStackResult {
  const [items, setItems] = useState<StackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const revision = useRef(0);
  const ephemeral = options.ephemeral === true;
  const cloudId = ephemeral || isLocalPreview ? null : reportId;
  const localKey = options.localScope ? `${LOCAL_KEY}_${options.localScope}` : reportId ? `${LOCAL_KEY}_${reportId}` : LOCAL_KEY;
  const encodeSource = (source: string | null | undefined, round?: number) => round == null ? source ?? null : `r${round}|${source ?? ""}`;
  const decodeItem = (raw: StackItem): StackItem => {
    const m = raw.source?.match(/^r(\d+)\|(.*)$/);
    return { ...raw, source: m ? m[2] || null : raw.source, round: m ? Number(m[1]) : raw.round };
  };
  const readLocal = useCallback((): StackItem[] => {
    if (ephemeral) return [];
    try {
      let raw = localStorage.getItem(localKey);
      // Adopt the one legacy browser draft once; subsequent new sessions are isolated.
      if (!raw && !cloudId && options.localScope) {
        raw = localStorage.getItem(LOCAL_KEY);
        if (raw) { localStorage.setItem(localKey, raw); localStorage.removeItem(LOCAL_KEY); }
      }
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [localKey, cloudId, ephemeral, options.localScope]);
  const persistLocal = useCallback((next: StackItem[]) => {
    if (ephemeral) return true;
    try { localStorage.setItem(localKey, JSON.stringify(next)); return true; }
    catch { toast.error("Browser storage is full. This insight is not saved; copy it before leaving."); return false; }
  }, [ephemeral, localKey]);

  const refresh = useCallback(async () => {
    const generation = ++revision.current;
    const pending = readLocal();
    if (!cloudId) { setItems(pending); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("idea_stack_items").select("*").eq("report_id", cloudId).is("deleted_at", null).order("position", { ascending: true });
      if (error) throw error;
      const saved = (data || []).map(item => decodeItem(item as StackItem));
      const missing = pending.filter(item => !saved.some(row => row.id === item.id));
      if (missing.length) {
        const rows = missing.map(item => ({ id: item.id, report_id: cloudId, kind: item.kind, source: encodeSource(item.source, item.round), label: item.label, content: item.content, position: saved.length + item.position, pinned: item.pinned }));
        const { data: migrated, error: migrateError } = await supabase.from("idea_stack_items").upsert(rows, { onConflict: "id" }).select();
        if (migrateError || migrated?.length !== rows.length) throw migrateError || new Error("Insight migration did not complete.");
        saved.push(...migrated.map(item => decodeItem(item as StackItem)));
      }
      if (generation === revision.current) { setItems(saved); localStorage.removeItem(localKey); }
    } catch (error) {
      console.error("Stack load error:", error);
      if (generation === revision.current) { if (pending.length) setItems(pending); toast.error("Saved insights could not be loaded or synced. Browser drafts remain available."); }
    } finally { if (generation === revision.current) setLoading(false); }
  }, [cloudId, localKey, readLocal]);
  const invalidateRefresh = useCallback(() => { revision.current++; }, []);
  useEffect(() => { void refresh(); return invalidateRefresh; }, [refresh, invalidateRefresh]);

  const add = useCallback(async ({ kind, source = null, label, content, pinned = false, round }: AddItemArgs) => {
    const local: StackItem = { id: crypto.randomUUID(), report_id: cloudId || "", kind, source, label, content, position: items.length, pinned, deleted_at: null, created_at: new Date().toISOString(), round };
    if (!cloudId) {
      const next = [...items, local];
      if (!persistLocal(next)) return null;
      setItems(next); return local;
    }
    try {
      const { data, error } = await supabase.from("idea_stack_items").insert({ id: local.id, report_id: cloudId, kind, source: encodeSource(source, round), label, content, position: local.position, pinned }).select().single();
      if (error || !data) throw error || new Error("No saved insight returned.");
      const created = decodeItem(data as StackItem); setItems(prev => [...prev, created]); return created;
    } catch (error) { console.error("Stack add error:", error); toast.error("Insight was not saved. Please try again."); return null; }
  }, [items, cloudId, persistLocal]);

  const togglePin = useCallback(async (id: string) => {
    const item = items.find(row => row.id === id); if (!item) return;
    const next = items.map(row => row.id === id ? { ...row, pinned: !row.pinned } : row);
    if (!cloudId) { if (persistLocal(next)) setItems(next); return; }
    try {
      const { error } = await supabase.from("idea_stack_items").update({ pinned: !item.pinned }).eq("id", id).select("id").single();
      if (error) throw error; setItems(next);
    } catch { toast.error("Pin was not saved. Please try again."); }
  }, [items, cloudId, persistLocal]);
  const remove = useCallback(async (id: string) => {
    const next = items.filter(row => row.id !== id);
    if (!cloudId) { if (persistLocal(next)) setItems(next); return; }
    try {
      const { error } = await supabase.from("idea_stack_items").update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id").single();
      if (error) throw error; setItems(next);
    } catch { toast.error("Insight was not removed. Please try again."); }
  }, [items, cloudId, persistLocal]);
  const reorder = useCallback(async (orderedIds: string[]) => {
    if (orderedIds.length !== items.length || new Set(orderedIds).size !== items.length) return;
    const next = orderedIds.map((id, position) => ({ ...items.find(item => item.id === id)!, position }));
    if (next.some(item => !item.id)) return;
    if (!cloudId) { if (persistLocal(next)) setItems(next); return; }
    try {
      const results = await Promise.all(next.map(item => supabase.from("idea_stack_items").update({ position: item.position }).eq("id", item.id).select("id").single()));
      if (results.some(result => result.error)) throw new Error("Reorder incomplete");
      setItems(next);
    } catch { toast.error("Order was not fully saved. Reloading the saved order."); await refresh(); }
  }, [items, cloudId, persistLocal, refresh]);
  const hasItem = useCallback((kind: StackKind, source: string | null | undefined, label: string) => items.some(item => item.kind === kind && (item.source || null) === (source || null) && item.label === label), [items]);
  return { items, loading, add, togglePin, remove, reorder, refresh, hasItem };
}
