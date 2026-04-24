import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, Sparkles, ArrowRight, Plus, Zap, Eye, EyeOff,
  GitBranch, BarChart3, ChevronDown, ChevronRight, Copy, X,
  Maximize2, Minimize2, MessageSquare, Play
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { copyToClipboard } from "@/lib/copyToClipboard";

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
  user_id: string | null;
}

interface PerspectiveCount {
  report_id: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  "in-progress": { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  "brief-complete": { label: "Brief Ready", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  "thunderdome-active": { label: "Deep Dive", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
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

/* ─── Progress helpers ─── */
const computeProgress = (report: IdeaReport, pCount: number) => {
  let steps = 0;
  let total = 5; // brief, perspectives (5), expand, distill, prompt
  if (report.brief) steps++;
  steps += Math.min(pCount, 5) * 0.6; // Each perspective = 0.6 of a step (max 3)
  if (report.thunderdome_unlocked) steps += 0.5;
  if (report.lovable_prompt) steps++;
  return Math.min(Math.round((steps / total) * 100), 100);
};

/* ─── Lineage helpers ─── */
interface TreeNode {
  report: IdeaReport;
  children: TreeNode[];
}

function buildLineageTree(reports: IdeaReport[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  reports.forEach(r => map.set(r.id, { report: r, children: [] }));

  const roots: TreeNode[] = [];
  reports.forEach(r => {
    if (r.parent_idea_id && map.has(r.parent_idea_id)) {
      map.get(r.parent_idea_id)!.children.push(map.get(r.id)!);
    } else {
      roots.push(map.get(r.id)!);
    }
  });
  return roots;
}

/* ─── Compare Panel ─── */
const ComparePanel = ({ ideas, onClose }: { ideas: IdeaReport[]; onClose: () => void }) => {
  const [a, b] = ideas;
  const sections = ["problem", "target_customer", "revenue_model", "industry_trends"] as const;
  const sectionLabels: Record<string, string> = {
    problem: "Problem",
    target_customer: "Target Customer",
    revenue_model: "Revenue Model",
    industry_trends: "Industry & Trends",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-xl font-bold text-foreground">Side-by-Side Compare</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Headers */}
          {[a, b].map((idea) => (
            <div key={idea.id} className="p-4 rounded-lg border border-border bg-card/50">
              <p className="font-display text-sm font-bold text-foreground truncate">{idea.idea.slice(0, 60)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(idea.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}

          {/* Section comparisons */}
          {sections.map((key) => (
            <div key={key} className="contents">
              {[a, b].map((idea) => (
                <div key={`${idea.id}-${key}`} className="p-4 rounded-lg border border-border/30">
                  <p className="text-[10px] text-primary uppercase tracking-wider mb-2">
                    {sectionLabels[key]}
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {idea.brief?.[key] || "—"}
                  </p>
                </div>
              ))}
            </div>
          ))}

          {/* Feature count */}
          {[a, b].map((idea) => (
            <div key={`${idea.id}-features`} className="p-4 rounded-lg border border-border/30">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-2">Core Features</p>
              {Array.isArray(idea.brief?.core_features) ? (
                <ul className="space-y-1">
                  {idea.brief.core_features.map((f: any, i: number) => (
                    <li key={i} className="text-xs text-foreground/80">
                      <span className="text-primary font-bold">{i + 1}.</span> {f.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          ))}

          {/* Thesis */}
          {[a, b].map((idea) => (
            <div key={`${idea.id}-thesis`} className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-2">Thesis</p>
              <p className="text-xs text-foreground/80 italic leading-relaxed">
                {idea.thesis_statement || "Not yet generated"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Idea Card ─── */
const IdeaCard = ({
  report,
  perspectiveCount,
  isSelected,
  onSelect,
  onNavigate,
  onQuickAction,
  depth = 0,
}: {
  report: IdeaReport;
  perspectiveCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onNavigate: () => void;
  onQuickAction: (action: string) => void;
  depth?: number;
}) => {
  const status = getStatusInfo(report);
  const progress = computeProgress(report, perspectiveCount);
  const intent = report.brief?.builder_intent;
  const productName = getProductName(report);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative border rounded-lg transition-all cursor-pointer ${
        isSelected
          ? "border-primary/60 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
      }`}
      style={{ marginLeft: depth * 24 }}
    >
      {/* Selection checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        className={`absolute top-3 left-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-all z-10 ${
          isSelected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border/50 opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected && <span className="text-[10px]">✓</span>}
      </button>

      {/* Lineage connector */}
      {depth > 0 && (
        <div className="absolute -left-3 top-6 w-3 h-px bg-primary/30" />
      )}

      <div className="p-4 pl-10" onClick={onNavigate}>
        <div className="flex items-start gap-3">
          {/* Logo */}
          {report.logo_image_url ? (
            <div className="w-11 h-11 rounded-lg overflow-hidden border border-border/50 shrink-0">
              <img src={report.logo_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Title + Status */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-bold text-foreground truncate">
                {productName}
              </h3>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock size={10} />
                {new Date(report.created_at).toLocaleDateString()}
              </span>
              {intent && (
                <span className="text-[11px] text-muted-foreground">
                  {intentEmoji[intent] || ""} {intent}
                </span>
              )}
              {perspectiveCount > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Zap size={10} />
                  {perspectiveCount}/5
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{progress}%</span>
            </div>

            {/* Thesis */}
            {report.thesis_statement && (
              <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-1 italic">
                "{report.thesis_statement}"
              </p>
            )}
          </div>

          <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
        </div>

        {/* Quick actions — visible on hover */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/20 opacity-0 group-hover:opacity-100 transition-opacity">
          {report.lovable_prompt && (
            <button
              onClick={(e) => { e.stopPropagation(); onQuickAction("copy-prompt"); }}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Copy size={10} /> Copy Prompt
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAction("fork"); }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <GitBranch size={10} /> Fork
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onQuickAction("deep-dive"); }}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Zap size={10} /> Deep Dive
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Helpers ─── */
function getStatusInfo(report: IdeaReport) {
  if (report.status && statusConfig[report.status]) return statusConfig[report.status];
  if (report.lovable_prompt) return statusConfig["prompt-ready"];
  if (report.thunderdome_unlocked) return statusConfig["thunderdome-active"];
  if (report.brief) return statusConfig["brief-complete"];
  return statusConfig["in-progress"];
}

function getProductName(report: IdeaReport): string {
  const idea = report.idea || "";
  if (idea.length <= 50) return idea;
  const firstSentence = idea.split(/[.!?]/)[0];
  if (firstSentence.length <= 60) return firstSentence;
  return idea.slice(0, 50) + "...";
}

/* ─── Main Component ─── */
const MySimulations = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<IdeaReport[]>([]);
  const [perspectiveCounts, setPerspectiveCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAll, setShowAll] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [viewMode, setViewMode] = useState<"flat" | "tree">("flat");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Sign in to view your dashboard.");
        navigate("/auth");
        return;
      }
      setUserEmail(session.user.email || "");
      setCurrentUserId(session.user.id);

      const { data: roleData } = await (supabase.from("user_roles") as any)
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);

      let query = (supabase.from("idea_reports") as any)
        .select("id, idea, created_at, status, brief, lovable_prompt, concept_image_url, logo_image_url, thesis_statement, thunderdome_unlocked, parent_idea_id, user_id")
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 2) next.add(id);
      else {
        // Replace oldest selection
        const arr = Array.from(next);
        next.delete(arr[0]);
        next.add(id);
      }
      return next;
    });
  };

  const handleQuickAction = async (reportId: string, action: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    if (action === "copy-prompt" && report.lovable_prompt) {
      const ok = await copyToClipboard(report.lovable_prompt);
      if (ok) toast.success("Prompt copied!");
    } else if (action === "fork") {
      navigate("/simulate", {
        state: {
          prefillIdea: report.idea,
          forkedFrom: report.idea,
        },
      });
    } else if (action === "deep-dive") {
      navigate(`/simulate?id=${reportId}`);
    }
  };

  const firstName = userEmail.split("@")[0]?.split(".")[0] || "there";
  const filteredReports = isAdmin && !showAll
    ? reports.filter(r => r.user_id === currentUserId)
    : reports;

  const lineageTree = buildLineageTree(filteredReports);

  const selectedReports = filteredReports.filter(r => selectedIds.has(r.id));

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => (
    <div key={node.report.id}>
      <IdeaCard
        report={node.report}
        perspectiveCount={perspectiveCounts[node.report.id] || 0}
        isSelected={selectedIds.has(node.report.id)}
        onSelect={() => toggleSelect(node.report.id)}
        onNavigate={() => navigate(`/simulate?id=${node.report.id}`)}
        onQuickAction={(action) => handleQuickAction(node.report.id, action)}
        depth={depth}
      />
      {node.children.length > 0 && (
        <div className="mt-2 space-y-2 relative">
          <div className="absolute left-5 top-0 bottom-4 w-px bg-primary/15" style={{ marginLeft: depth * 24 }} />
          {node.children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground">
                Hey {firstName.charAt(0).toUpperCase() + firstName.slice(1)} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {reports.length > 0
                  ? `${reports.length} idea${reports.length !== 1 ? "s" : ""} in your lab`
                  : "Your ideas live here"}
              </p>
            </div>
            <button
              onClick={() => navigate("/simulate")}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              New Simulation
            </button>
          </div>

          {/* Toolbar: Admin toggle + View mode + Compare */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {isAdmin && (
              <button
                onClick={() => setShowAll(prev => !prev)}
                className={`flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                  showAll
                    ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {showAll ? <Eye size={12} /> : <EyeOff size={12} />}
                {showAll ? "All ideas" : "My ideas only"}
              </button>
            )}

            {filteredReports.length > 1 && (
              <>
                <button
                  onClick={() => setViewMode(prev => prev === "flat" ? "tree" : "flat")}
                  className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                    viewMode === "tree"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <GitBranch size={11} />
                  {viewMode === "tree" ? "Lineage view" : "Flat view"}
                </button>

                <AnimatePresence>
                  {selectedIds.size === 2 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setShowCompare(true)}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full border border-accent/40 bg-accent/10 text-accent"
                    >
                      <BarChart3 size={11} />
                      Compare selected
                    </motion.button>
                  )}
                </AnimatePresence>
              </>
            )}

            {isAdmin && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                Admin · {filteredReports.length} showing
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-pulse text-sm text-muted-foreground">Loading your ideas...</div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Sparkles size={24} className="text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground mb-2">No ideas yet</h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                Run your first simulation to see your ideas come to life.
              </p>
              <button
                onClick={() => navigate("/simulate")}
                className="text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                <Sparkles size={14} />
                Run Your First Simulation
              </button>
            </div>
          ) : viewMode === "tree" ? (
            <div className="space-y-3">
              {lineageTree.map(node => renderTreeNode(node))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((report) => (
                <IdeaCard
                  key={report.id}
                  report={report}
                  perspectiveCount={perspectiveCounts[report.id] || 0}
                  isSelected={selectedIds.has(report.id)}
                  onSelect={() => toggleSelect(report.id)}
                  onNavigate={() => navigate(`/simulate?id=${report.id}`)}
                  onQuickAction={(action) => handleQuickAction(report.id, action)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compare overlay */}
      <AnimatePresence>
        {showCompare && selectedReports.length === 2 && (
          <ComparePanel ideas={selectedReports} onClose={() => setShowCompare(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

export default MySimulations;
