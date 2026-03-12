import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimulationRow {
  id: string;
  idea: string;
  created_at: string;
  rounds: any[];
  lovable_prompt: string | null;
  concept_image_url: string | null;
  logo_image_url: string | null;
}

const DRAFT_KEY = "vibeco_simulator_draft";

const MySimulations = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SimulationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Sign in to view your simulations.");
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await (supabase.from("simulator_captures") as any)
        .select("id, idea, created_at, rounds, lovable_prompt, concept_image_url, logo_image_url")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load simulations.");
      }
      setSessions((data as SimulationRow[]) || []);
      setLoading(false);
    })();
  }, [navigate]);

  const handleResume = (session: SimulationRow) => {
    // Build a draft object and store it in localStorage, then navigate to /simulate
    const rounds = Array.isArray(session.rounds) ? session.rounds : [];
    const draft = {
      phase: session.lovable_prompt ? "final" : rounds.length > 0 ? "brief" : "input",
      idea: session.idea,
      rounds,
      currentRound: Math.max(0, rounds.length - 1),
      highlights: [],
      conceptImage: session.concept_image_url,
      logoImage: session.logo_image_url,
      lovablePrompt: session.lovable_prompt,
      unlocked: !!session.lovable_prompt,
      unlockEmail: "",
      reportId: null,
      sessionId: session.id,
      savedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate("/simulate");
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <h1 className="font-display text-2xl font-black text-foreground">My Simulations</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse font-mono text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-mono text-sm text-muted-foreground mb-4">No simulations yet.</p>
            <Link to="/simulate" className="inline-flex items-center gap-2 font-mono text-sm text-primary hover:underline">
              Start your first simulation <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group border border-border rounded-lg p-4 hover:border-primary/40 transition-colors cursor-pointer bg-card"
                onClick={() => handleResume(s)}
              >
                <div className="flex items-start gap-4">
                  {s.logo_image_url ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/50 shrink-0">
                      <img src={s.logo_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Sparkles size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-bold text-foreground truncate">
                      {s.idea.slice(0, 80)}{s.idea.length > 80 ? "..." : ""}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {Array.isArray(s.rounds) ? s.rounds.length : 0} round{Array.isArray(s.rounds) && s.rounds.length !== 1 ? "s" : ""}
                      </span>
                      {s.lovable_prompt && (
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Complete
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySimulations;
