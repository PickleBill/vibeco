import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, FolderKanban, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string | null;
  parent_brand: string | null;
  lovable_project_id: string | null;
  priority: number | null;
  last_touched: string | null;
}

const statusColor: Record<string, string> = {
  live: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  active: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  building: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  paused: "text-muted-foreground border-border bg-muted/10",
  archived: "text-muted-foreground border-border bg-muted/10",
};

const ProjectsTab = () => {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("project_registry")
        .select("id,name,description,category,status,parent_brand,lovable_project_id,priority,last_touched")
        .order("priority", { ascending: false })
        .order("last_touched", { ascending: false, nullsFirst: false });
      if (error) setError(error.message);
      else setRows((data as ProjectRow[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading projects…
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Couldn't load the project registry. {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="py-16 text-center">
        <FolderKanban className="mx-auto mb-3 text-muted-foreground/40" size={28} />
        <p className="text-sm text-muted-foreground">No projects registered yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Register projects in the Courtana MCP <span className="font-mono">project_registry</span> to see them here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
        Each card is a <span className="text-foreground">pointer</span> to a project's canonical state — not a copy.
        The single source of truth lives in the Courtana MCP server; this view just reads it.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p, i) => {
          const sc = (p.status && statusColor[p.status.toLowerCase()]) || "text-muted-foreground border-border bg-muted/10";
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="rounded-lg border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-foreground leading-tight">{p.name}</h3>
                {p.status && (
                  <span className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded border ${sc}`}>
                    {p.status}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {p.parent_brand && (
                  <span className="font-mono text-[10px] text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                    {p.parent_brand}
                  </span>
                )}
                {p.category && (
                  <span className="font-mono text-[10px] text-muted-foreground">{p.category}</span>
                )}
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-2.5 line-clamp-3 leading-relaxed">{p.description}</p>
              )}
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
                  <FileText size={11} /> CLAUDE.md · .impeccable.md
                </span>
                {p.lovable_project_id && (
                  <a
                    href={`https://lovable.dev/projects/${p.lovable_project_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    Open <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectsTab;
