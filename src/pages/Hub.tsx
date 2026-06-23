import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Network, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProjectsTab from "@/components/hub/ProjectsTab";
import DecisionsTab from "@/components/hub/DecisionsTab";
import ConnectorsTab from "@/components/hub/ConnectorsTab";

/**
 * Org Knowledge Hub — a subtle, signed-in surface over the shared org memory:
 * project pointers, cross-project decisions, and connector sync status. The
 * canonical truth lives in the Courtana MCP server; this view reads/writes it.
 */
const Hub = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "anon" | "ready">("loading");

  useEffect(() => {
    async function check(session: import("@supabase/supabase-js").Session | null) {
      const u = session?.user;
      // Require a real (non-anonymous) account — the hub is org-internal.
      if (!u || (u as { is_anonymous?: boolean }).is_anonymous) {
        setStatus("anon");
      } else {
        setStatus("ready");
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => check(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => check(session));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 lg:px-12 pt-28 pb-24">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2.5 mb-2">
            <Network size={20} className="text-primary" />
            <h1 className="font-display text-3xl font-black text-foreground tracking-tight">Org Knowledge Hub</h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            One source of truth across the Courtana ecosystem — projects, decisions, and connectors.
            Pointers, not copies; the Courtana MCP server holds the canonical state.
          </p>
        </motion.div>

        <div className="mt-8">
          {status === "loading" ? (
            <div className="flex items-center justify-center py-28 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading…
            </div>
          ) : status === "anon" ? (
            <div className="rounded-lg border border-border bg-card/40 p-10 text-center max-w-md mx-auto mt-12">
              <Lock className="mx-auto mb-3 text-muted-foreground/50" size={28} />
              <h2 className="font-display font-semibold text-foreground mb-1">Sign in to view the hub</h2>
              <p className="text-sm text-muted-foreground mb-5">
                The Org Knowledge Hub is internal. Sign in with your Courtana account to continue.
              </p>
              <button
                onClick={() => navigate("/auth")}
                className="rounded-sm font-mono text-sm px-5 py-2 bg-primary text-primary-foreground hover:brightness-110 transition"
              >
                Sign in
              </button>
            </div>
          ) : (
            <Tabs defaultValue="projects">
              <TabsList className="bg-card/40 border border-border">
                <TabsTrigger value="projects" className="font-mono text-xs">Projects</TabsTrigger>
                <TabsTrigger value="decisions" className="font-mono text-xs">Decisions</TabsTrigger>
                <TabsTrigger value="connectors" className="font-mono text-xs">Connectors</TabsTrigger>
              </TabsList>
              <TabsContent value="projects" className="mt-6">
                <ProjectsTab />
              </TabsContent>
              <TabsContent value="decisions" className="mt-6">
                <DecisionsTab />
              </TabsContent>
              <TabsContent value="connectors" className="mt-6">
                <ConnectorsTab />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default Hub;
