import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plug, CheckCircle2, Circle, AlertCircle, Clock, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConnectorRow {
  id: string;
  key: string;
  display_name: string;
  project: string;
  status: string;
  auth_kind: string;
  config: { note?: string } | null;
  updated_at: string;
}

interface SyncEvent {
  id: string;
  connector_key: string;
  project: string;
  status: string;
  items_collected: number;
  message: string | null;
  created_at: string;
}

const statusMeta: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  active: { label: "Active", cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", Icon: CheckCircle2 },
  dormant: { label: "Dormant", cls: "text-muted-foreground border-border bg-muted/10", Icon: Circle },
  error: { label: "Error", cls: "text-red-400 border-red-500/30 bg-red-500/10", Icon: AlertCircle },
};

const authKindLabel: Record<string, string> = {
  workspace: "Workspace connector",
  secret: "API key (secret)",
  keyless: "Keyless / public",
};

const ConnectorsTab = () => {
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: cRows, error: cErr }, { data: eRows, error: eErr }] = await Promise.all([
        supabase
          .from("connector_registry")
          .select("id,key,display_name,project,status,auth_kind,config,updated_at")
          .order("status", { ascending: true })
          .order("display_name", { ascending: true }),
        supabase
          .from("connector_sync_events")
          .select("id,connector_key,project,status,items_collected,message,created_at")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);
      if (cErr) setError(cErr.message);
      else setConnectors((cRows as ConnectorRow[]) || []);
      if (!eErr) setEvents((eRows as SyncEvent[]) || []);
      setLoading(false);
    })();
  }, []);

  const lastSyncFor = (key: string) => events.find((e) => e.connector_key === key) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading connectors…
      </div>
    );
  }
  if (error) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Couldn't load connectors. {error}</div>;
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-sm text-muted-foreground mb-5 max-w-2xl">
          The shared connector registry. v1, v2, and other apps publish sync activity into the same timeline.
          Key setup happens at the workspace level — this surface tracks status, it doesn't store keys.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {connectors.map((c, i) => {
            const meta = statusMeta[c.status] || statusMeta.dormant;
            const last = lastSyncFor(c.key);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-lg border border-border bg-card/40 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Plug size={15} className="text-muted-foreground shrink-0" />
                    <h3 className="font-display font-semibold text-foreground truncate">{c.display_name}</h3>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border ${meta.cls}`}>
                    <meta.Icon size={10} /> {meta.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-muted-foreground">
                  <span className="text-primary/80">{c.key}</span>
                  <span className="inline-flex items-center gap-1">
                    <KeyRound size={10} /> {authKindLabel[c.auth_kind] || c.auth_kind}
                  </span>
                </div>
                {c.config?.note && (
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.config.note}</p>
                )}
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
                  <Clock size={11} />
                  {last ? (
                    <span>
                      last sync {new Date(last.created_at).toLocaleString()} · {last.items_collected} items
                    </span>
                  ) : (
                    <span>no syncs logged yet</span>
                  )}
                </div>
                {c.status === "dormant" && (
                  <div className="mt-3 rounded-sm bg-[#6A2CF5]/5 border border-[#6A2CF5]/20 px-3 py-2">
                    <p className="text-[11px] text-foreground/90 font-medium mb-0.5">To activate</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {c.auth_kind === "workspace"
                        ? "Add this connector at the workspace level, then link it to the project."
                        : c.auth_kind === "secret"
                        ? "Provide the connector's API key as a project secret, then flip status to active."
                        : "Wire the adapter into a collector edge function."}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="font-display font-semibold text-foreground mb-4">Recent sync activity</h3>
        {!events.length ? (
          <p className="text-sm text-muted-foreground">No sync events yet. Run a collector to populate the timeline.</p>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card/30 px-4 py-2.5">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${e.status === "ok" ? "bg-emerald-400" : "bg-red-400"}`} />
                <span className="font-mono text-[11px] text-primary/80 w-32 shrink-0 truncate">{e.connector_key}</span>
                <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{e.message || `${e.items_collected} items`}</span>
                <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ConnectorsTab;
