import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, BrainCircuit, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DecisionRow {
  id: string;
  session_id: string;
  project: string;
  category: string;
  title: string;
  content: string;
  embedding: unknown | null;
  created_at: string;
}

const CATEGORIES = ["architecture", "design", "strategy", "pattern", "insight"];

const categoryColor: Record<string, string> = {
  architecture: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  design: "text-[#6A2CF5] bg-[#6A2CF5]/10 border-[#6A2CF5]/30",
  strategy: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  pattern: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  insight: "text-muted-foreground bg-muted/10 border-border",
};

const DecisionsTab = () => {
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", project: "vibeco", category: "insight" });

  async function load() {
    setLoading(true);
    let q = supabase
      .from("org_decisions")
      .select("id,session_id,project,category,title,content,embedding,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filterProject) q = q.eq("project", filterProject);
    if (filterCategory) q = q.eq("category", filterCategory);
    const { data, error } = await q;
    if (error) setError(error.message);
    else {
      setRows((data as DecisionRow[]) || []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProject, filterCategory]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("org_decisions").insert({
      session_id: "vibeco-hub-ui",
      project: form.project.trim() || "general",
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save decision. " + error.message);
      return;
    }
    toast.success("Decision recorded. (Semantic embedding added on next MCP sync.)");
    setForm({ title: "", content: "", project: form.project, category: "insight" });
    setShowForm(false);
    load();
  }

  const projects = Array.from(new Set(rows.map((r) => r.project))).sort();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground max-w-xl">
          Cross-project decisions and insights — shared org memory the Courtana MCP server reads and writes.
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-sm font-mono text-sm px-3 py-1.5 bg-primary text-primary-foreground hover:brightness-110 transition"
        >
          <Plus size={14} /> Record decision
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleSave}
          className="rounded-lg border border-border bg-card/40 p-4 mb-6 space-y-3"
        >
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short title (e.g. 'Route marquee reasoning to GPT-5.5')"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="The decision, rationale, and context…"
            rows={4}
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary resize-y"
          />
          <div className="flex flex-wrap gap-3">
            <input
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              placeholder="project"
              className="bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono w-32 focus:outline-none focus:border-primary"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-background border border-border rounded-sm px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-sm font-mono text-sm px-4 py-1.5 bg-primary text-primary-foreground hover:brightness-110 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Save
            </button>
          </div>
        </motion.form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => { setFilterProject(""); setFilterCategory(""); }}
          className={`font-mono text-[11px] px-2 py-1 rounded border transition ${!filterProject && !filterCategory ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          all
        </button>
        {projects.map((p) => (
          <button
            key={p}
            onClick={() => setFilterProject(filterProject === p ? "" : p)}
            className={`font-mono text-[11px] px-2 py-1 rounded border transition ${filterProject === p ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {p}
          </button>
        ))}
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(filterCategory === c ? "" : c)}
            className={`font-mono text-[11px] px-2 py-1 rounded border transition ${filterCategory === c ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading decisions…
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Couldn't load decisions. {error}</div>
      ) : !rows.length ? (
        <div className="py-16 text-center">
          <BrainCircuit className="mx-auto mb-3 text-muted-foreground/40" size={28} />
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Record the first one — it becomes shared context for every session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.25) }}
              className="rounded-lg border border-border bg-card/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display font-semibold text-foreground leading-tight">{d.title}</h3>
                <span className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded border ${categoryColor[d.category] || categoryColor.insight}`}>
                  {d.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{d.content}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground/70">
                <span className="text-primary/80">{d.project}</span>
                <span>·</span>
                <span>{new Date(d.created_at).toLocaleDateString()}</span>
                <span>·</span>
                <span>{d.embedding ? "semantic ✓" : "filter-only"}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionsTab;
