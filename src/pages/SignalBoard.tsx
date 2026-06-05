import { useEffect, useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Radar, Sparkles, ArrowUpRight, X, Quote, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Signal Board — the human-gated surface for Signal Mine (Stage 5).
 * Ranked feature candidates mined from public social pain points, each with a
 * pain score, evidence, paraphrased quotes, and a one-tap promote/dismiss.
 * See docs/SOCIAL_LISTENING_PRD.md.
 */

interface Candidate {
  id?: string;
  cluster_theme: string;
  problem: string;
  proposed_solution: string;
  representative_quotes: string[];
  pain_score: number;   // 0..100
  confidence: number;   // 0..100
  effort: "S" | "M" | "L";
  evidence: { member_count: number; sources: string[] };
  status?: "open" | "promoted" | "dismissed";
}

// Seed so the board is meaningful before a live scan / backend wiring.
const SAMPLE: Candidate[] = [
  {
    cluster_theme: "No proof of a hole-in-one",
    problem: "Golfers who ace a hole have no trusted record — playing partners forget, and there's nothing to show or verify later.",
    proposed_solution: "Auto-mint a verifiable Ace Card (course, hole, date, witnesses) the moment an ace is confirmed; one-tap share.",
    representative_quotes: ["Aced a par 3 and had zero proof afterward", "Wish there was a way to log/verify a hole-in-one"],
    pain_score: 86, confidence: 78, effort: "M",
    evidence: { member_count: 14, sources: ["reddit"] },
  },
  {
    cluster_theme: "Settle-up after side bets is awkward",
    problem: "Groups lose track of who owes whom on skins/nassau and chasing Venmo after the round kills the vibe.",
    proposed_solution: "Auto-tallied net positions with a single 'request from group' settle button at the turn and after 18.",
    representative_quotes: ["Always a mess figuring out who owes what", "Spend 20 min after every round on Venmo math"],
    pain_score: 72, confidence: 70, effort: "M",
    evidence: { member_count: 9, sources: ["reddit", "appstore_review"] },
  },
  {
    cluster_theme: "Distrust of payout/contest legitimacy",
    problem: "Players hesitate to pay into on-course contests because they don't trust the payout will actually happen.",
    proposed_solution: "Show reinsured-pot badge + public payout history + 'verified by' provenance before the pay step.",
    representative_quotes: ["How do I know they'll actually pay out?", "Felt sketchy putting money in"],
    pain_score: 68, confidence: 65, effort: "S",
    evidence: { member_count: 7, sources: ["reddit"] },
  },
];

const painTone = (s: number) =>
  s >= 75 ? "text-destructive" : s >= 55 ? "text-warning" : "text-muted-foreground";

const SignalBoard = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE);
  const [scanning, setScanning] = useState(false);
  const [counts, setCounts] = useState<{ collected: number; pain: number; clusters: number; candidates: number } | null>(null);
  const [usingSample, setUsingSample] = useState(true);

  // Try to load any persisted candidates on mount (falls back to sample).
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("feature_candidates")
          .select("*")
          .eq("status", "open")
          .order("pain_score", { ascending: false })
          .limit(30);
        if (!error && data && data.length) {
          setCandidates(data as Candidate[]);
          setUsingSample(false);
        }
      } catch { /* table not migrated yet — keep sample */ }
    })();
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data: collected, error: cErr } = await supabase.functions.invoke("signal-collect", {
        body: { product: "niceace", persist: false },
      });
      if (cErr) throw cErr;
      const items = (collected as any)?.items ?? [];
      if (!items.length) { toast.error("No items collected (source rate-limit?). Showing sample."); return; }

      const { data: result, error: pErr } = await supabase.functions.invoke("signal-process", {
        body: { product: "niceace", items },
      });
      if (pErr) throw pErr;

      const r = result as any;
      setCandidates(r.candidates ?? []);
      setCounts(r.counts ?? null);
      setUsingSample(false);
      toast.success(`Scan complete — ${r.counts?.candidates ?? 0} candidates from ${r.counts?.collected ?? items.length} items`);
    } catch (e: any) {
      toast.error(`Scan failed: ${e?.message ?? "unknown"} — showing sample board`);
    } finally {
      setScanning(false);
    }
  };

  const setStatus = async (idx: number, status: "promoted" | "dismissed") => {
    const c = candidates[idx];
    setCandidates((prev) => prev.map((x, i) => (i === idx ? { ...x, status } : x)));
    toast[status === "promoted" ? "success" : "message"](
      status === "promoted" ? `Promoted "${c.cluster_theme}" → change request` : `Dismissed "${c.cluster_theme}"`,
    );
    if (c.id) {
      try { await (supabase as any).from("feature_candidates").update({ status }).eq("id", c.id); } catch { /* noop */ }
    }
  };

  const visible = useMemo(() => candidates.filter((c) => !c.status || c.status === "open"), [candidates]);

  return (
    <HelmetProvider>
      <Helmet><title>Signal Board · Signal Mine</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container max-w-4xl py-10">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Radar className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Signal Mine</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Signal Board</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Customer pain points mined from public sources (Reddit + app-store reviews),
                clustered and turned into ranked, evidence-backed feature candidates. Promote
                the strongest into the build loop.
              </p>
            </div>
            <Button onClick={runScan} disabled={scanning} className="gap-2">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {scanning ? "Scanning…" : "Run scan"}
            </Button>
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {[
              ["Collected", counts?.collected ?? "—"],
              ["Pain points", counts?.pain ?? "—"],
              ["Clusters", counts?.clusters ?? "—"],
              ["Candidates", counts?.candidates ?? visible.length],
            ].map(([label, value]) => (
              <Card key={label as string} className="p-3">
                <div className="font-display text-2xl font-extrabold leading-none">{value as any}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
              </Card>
            ))}
          </div>

          {usingSample && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing a sample board. Click <span className="text-primary">Run scan</span> to mine live sources
              (requires the <code>signal-collect</code>/<code>signal-process</code> functions deployed).
            </p>
          )}

          {/* Candidates */}
          <div className="mt-6 space-y-4">
            {visible.map((c, idx) => {
              const realIdx = candidates.indexOf(c);
              return (
                <Card key={(c.id ?? c.cluster_theme) + idx} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1 font-display text-xl font-extrabold ${painTone(c.pain_score)}`}>
                      <TrendingUp className="h-4 w-4" />{Math.round(c.pain_score)}
                    </span>
                    <span className="text-[11px] uppercase tracking-widest text-muted-foreground">pain</span>
                    <h3 className="ml-1 font-display text-lg font-bold">{c.cluster_theme}</h3>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="secondary">{c.confidence}% conf</Badge>
                      <Badge variant="outline">effort {c.effort}</Badge>
                      <Badge variant="outline">{c.evidence.member_count} signals</Badge>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Problem</div>
                      <p className="mt-1 text-sm">{c.problem}</p>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-primary">Proposed feature</div>
                      <p className="mt-1 text-sm">{c.proposed_solution}</p>
                    </div>
                  </div>

                  {c.representative_quotes?.length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                      {c.representative_quotes.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <Quote className="h-3.5 w-3.5 shrink-0 opacity-60" /><span>{q}</span>
                        </div>
                      ))}
                      <div className="pt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        sources: {c.evidence.sources.join(" · ")}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="gap-1.5" onClick={() => setStatus(realIdx, "promoted")}>
                      Promote to change request <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setStatus(realIdx, "dismissed")}>
                      <X className="h-3.5 w-3.5" /> Dismiss
                    </Button>
                  </div>
                </Card>
              );
            })}

            {visible.length === 0 && (
              <Card className="p-10 text-center text-sm text-muted-foreground">
                Board is clear. Run a scan to mine fresh signal.
              </Card>
            )}
          </div>
        </main>
      </div>
    </HelmetProvider>
  );
};

export default SignalBoard;
