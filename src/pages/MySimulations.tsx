import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Sparkles, ArrowRight, Plus, Zap, Shield, Flame, Swords, Heart, Wrench, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface IdeaReport {
  id: string;
  idea: string;
  created_at: string;
  status: string | null;
  brief: any;
  lovable_prompt: string | null;
  concept_image_url: string | null;
  logo_image_url: string | null;
  thesis_statement: string | null;
  thunderdome_unlocked: boolean | null;
  parent_idea_id: string | null;
}

interface PerspectiveCount {
  report_id: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  "in-progress": { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  "brief-complete": { label: "Brief Ready", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  "thunderdome-active": { label: "Thunderdome", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  "prompt-ready": { label: "Prompt Ready", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
};

const intentEmoji: Record<string, string> = {
  experiment: "🧪",
  community: "👥",
  "lead-magnet": "🎯",
  lifestyle: "☀️",
  venture: "🚀",
  fun: "🎮",
};

const MySimulations = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<IdeaReport[]>([]);
  const [perspectiveCounts, setPerspectiveCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Sign in to view your dashboard.");
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email || "");

      // Check admin role
      const { data: roleData } = await (supabase.from("user_roles") as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);

      // Fetch idea_reports — admin sees all, others see own
      let query = (supabase.from("idea_reports") as any)
        .select("id, idea, created_at, status, brief, lovable_prompt, concept_image_url, logo_image_url, thesis_statement, thunderdome_unlocked, parent_idea_id")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!adminStatus) {
        query = query.eq("user_id", session.user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load your ideas.");
      }

      const reportsList = (data as IdeaReport[]) || [];
      setReports(reportsList);

      // Fetch perspective counts for all reports
      if (reportsList.length > 0) {
        const reportIds = reportsList.map(r => r.id);
        const { data: perspectives } = await (supabase.from("idea_perspectives") as any)
          .select("report_id")
          .in("report_id", reportIds);

        if (perspectives) {
          const counts: Record<string, number> = {};
          (perspectives as { report_id: string }[]).forEach(p => {
            counts[p.report_id] = (counts[p.report_id] || 0) + 1;
          });
          setPerspectiveCounts(counts);
        }
      }

      setLoading(false);
    })();
  }, [navigate]);

  const getStatusInfo = (report: IdeaReport) => {
    if (report.status && statusConfig[report.status]) return statusConfig[report.status];
    // Infer status from data
    if (report.lovable_prompt) return statusConfig["prompt-ready"];
    if (report.thunderdome_unlocked) return statusConfig["thunderdome-active"];
    if (report.brief) return statusConfig["brief-complete"];
    return statusConfig["in-progress"];
  };

  const getProductName = (report: IdeaReport): string => {
    // Try to extract a short product name from the idea
    const idea = report.idea || "";
    if (idea.length <= 50) return idea;
    // Take first sentence or first 50 chars
    const firstSentence = idea.split(/[.!?]/)[0];
    if (firstSentence.length <= 60) return firstSentence;
    return idea.slice(0, 50) + "...";
  };

  const firstName = userEmail.split("@")[0]?.split(".")[0] || "there";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground">
                Hey {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋
              </h1>
              <p className="font-mono text-sm text-muted-foreground mt-1">
                {reports.length > 0
                  ? `${reports.length} idea${reports.length !== 1 ? "s" : ""} in your lab`
                  : "Your ideas live here"}
              </p>
            </div>
            <button
              onClick={() => navigate("/simulate")}
              className="flex items-center gap-2 font-mono text-sm font-bold px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              New Simulation
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse font-mono text-sm text-muted-foreground">Loading your ideas...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles size={24} className="text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">No ideas yet</h2>
              <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Run your first simulation to see your ideas come to life with AI analysis, perspectives, and Lovable prompts.
              </p>
              <button
                onClick={() => navigate("/simulate")}
                className="font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                Run Your First Simulation
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {reports.map((report, i) => {
                const status = getStatusInfo(report);
                const pCount = perspectiveCounts[report.id] || 0;
                const intent = report.brief?.builder_intent;

                return (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group border border-border rounded-lg p-5 hover:border-primary/40 transition-all cursor-pointer bg-card hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => navigate(`/simulate?id=${report.id}`)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo/Thumbnail */}
                      {report.logo_image_url ? (
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-border/50 shrink-0">
                          <img src={report.logo_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Sparkles size={18} className="text-muted-foreground" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {/* Title + Status */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-display text-sm font-bold text-foreground truncate">
                            {getProductName(report)}
                          </h3>
                          <span className={`shrink-0 font-mono text-[10px] px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>

                          {intent && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {intentEmoji[intent] || ""} {intent}
                            </span>
                          )}

                          {pCount > 0 && (
                            <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                              <Zap size={10} />
                              {pCount}/5 perspectives
                            </span>
                          )}
                        </div>

                        {/* Thesis preview */}
                        {report.thesis_statement && (
                          <p className="font-mono text-xs text-muted-foreground/80 mt-2 line-clamp-1 italic">
                            "{report.thesis_statement}"
                          </p>
                        )}

                        {/* Lineage indicator */}
                        {report.parent_idea_id && (
                          <span className="inline-flex items-center gap-1 mt-1.5 font-mono text-[10px] text-accent">
                            ↳ Variation of another idea
                          </span>
                        )}
                      </div>

                      <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-2" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MySimulations;
