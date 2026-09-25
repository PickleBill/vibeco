import { useNavigate } from "react-router-dom";
import { isLocalPreview } from "@/lib/localPreview";
import { downloadText } from "@/lib/workbench";
import { invokeAI } from "@/lib/invokeAI";
import { useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { Radar, Sparkles, ArrowUpRight, X, Quote, Loader2, TrendingUp } from "lucide-react";
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
  evidence: { member_count: number; sources: string[]; source_refs?: {url:string;title:string;source:string}[]; quotes_are_paraphrases?: boolean };
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

interface Theme {
  id?: string;
  title: string;
  pain_score: number;
  trend: number;          // latest score − previous appearance
  occurrence_count: number;
  score_history: { t: string; s: number }[];
}

// Sample durable themes with history so the sparkline + trend render pre-backend.
const SAMPLE_THEMES: Theme[] = [
  { title: "No proof of a hole-in-one", pain_score: 86, trend: 9, occurrence_count: 5, score_history: [{ t: "", s: 61 }, { t: "", s: 70 }, { t: "", s: 74 }, { t: "", s: 77 }, { t: "", s: 86 }] },
  { title: "Settle-up after side bets is awkward", pain_score: 72, trend: -4, occurrence_count: 4, score_history: [{ t: "", s: 80 }, { t: "", s: 79 }, { t: "", s: 76 }, { t: "", s: 72 }] },
  { title: "Distrust of payout legitimacy", pain_score: 68, trend: 12, occurrence_count: 3, score_history: [{ t: "", s: 44 }, { t: "", s: 56 }, { t: "", s: 68 }] },
];

const painTone = (s: number) =>
  s >= 75 ? "text-destructive" : s >= 55 ? "text-warning" : "text-muted-foreground";

const trendLabel = (t: number) =>
  t > 1 ? { icon: "▲", cls: "text-rose-400" } : t < -1 ? { icon: "▼", cls: "text-emerald-400" } : { icon: "→", cls: "text-muted-foreground" };

// Tiny inline sparkline from a score history.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const w = 64, h = 20, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / span) * h}`).join(" ");
  const up = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={d} fill="none" strokeWidth="1.5" className={up ? "stroke-rose-400" : "stroke-emerald-400"} />
    </svg>
  );
}

interface CollectionResponse {
 items?: Record<string, unknown>[];
 collected?: number;
 warnings?: string[];
 partial?: boolean;
}
interface ScanResponse {
 candidates?: Candidate[];
 themes?: Theme[];
 counts?: {collected:number;pain:number;clusters:number;candidates:number};
}
const SignalBoard = () => {
  const [candidates, setCandidates] = useState<Candidate[]>(SAMPLE);
  const [themes, setThemes] = useState<Theme[]>(SAMPLE_THEMES);
  const [scanning, setScanning] = useState(false);
  const [counts, setCounts] = useState<{ collected: number; pain: number; clusters: number; candidates: number } | null>(null);
  const [usingSample, setUsingSample] = useState(true);
  const [topic, setTopic] = useState("");
  const [scanTopic,setScanTopic]=useState("");
  const [scanError,setScanError]=useState("");
  const [scanWarnings,setScanWarnings]=useState<string[]>([]);
  const navigate=useNavigate();

  const runScan = async () => {
    const t = topic.trim();
    const tag = t ? t.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) : "general";
    if(isLocalPreview){toast("Live scans are disconnected in this preview. The sample below is illustrative.");return;}
    if(!t)return;
    setScanError("");
    setScanning(true);
    try {
      // Public scans are transient; collection and processing do not write shared tables.
      // Topic-driven: an industry or idea expands into pain-oriented queries server-side.
      const { data: collected, error: cErr } = await invokeAI("signal-collect", {
        body: { product: tag, topic: t, persist: false, limit:4 },
      });
      if (cErr) throw cErr;
      const collection = collected as CollectionResponse;
      const allItems = collection.items || [];
      const items = allItems.slice(0,60).map((item)=>({source:item.source,source_url:item.source_url,title:String(item.title||"").slice(0,200),body:String(item.body||"").slice(0,1000)}));
      const warnings = [...(collection.warnings || []), ...(allItems.length>60 ? [`Analyzed the first 60 of ${allItems.length} collected items to keep this scan bounded.`] : [])];
      toast.message(`Collected ${collection.collected ?? allItems.length} items for this scan.`);

      // Classify, cluster, and synthesize only these explicitly supplied items.
      const { data: result, error: pErr } = await invokeAI("signal-process", {
        body: { product: tag, topic:t, product_context:`Explore customer problems and useful opportunities related to: ${t}`, items, persist: false },
      });
      if (pErr) throw pErr;

      const r = result as ScanResponse;
      if (!r || !Array.isArray(r.candidates)) throw new Error("The scanner returned an incomplete result");
      setCandidates(r.candidates ?? []);
      setThemes(r.themes ?? []);
      setScanTopic(t);
      setCounts(r.counts ?? null);
      setUsingSample(false);
      setScanWarnings(warnings);
      toast.success(`Scan complete — ${r.counts?.candidates ?? 0} candidates from ${r.counts?.collected ?? 0} items`);
    } catch (e: unknown) {
      setScanError(`Scan did not finish: ${e instanceof Error ? e.message : "unknown error"}. The previous board is unchanged.`);
    } finally {
      setScanning(false);
    }
  };

  const setStatus = (idx:number,status:"promoted"|"dismissed") => {
    const candidate=candidates[idx];
    if(status === "promoted") {
      const question=`Explore this opportunity: ${candidate.problem}\nProposed approach: ${candidate.proposed_solution}`;
      const urls=(candidate.evidence.source_refs||[]).map(ref=>ref.url);
      navigate(`/simulate?purpose=initiative&question=${encodeURIComponent(question)}`,{state:{sourceUrls:urls}});
      return;
    }
    setCandidates(prev=>prev.map((c,i)=>i===idx?{...c,status}:c));
    toast('Hidden from this view only.',{action:{label:'Undo',onClick:()=>setCandidates(prev=>prev.map((c,i)=>i===idx?{...c,status:'open'}:c))}});
  };

  const visible = useMemo(() => candidates.filter((c) => !c.status || c.status === "open"), [candidates]);

  return (
    <HelmetProvider>
      <Helmet><title>Signal Scanner · VibeCo</title></Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main id="main-content" className="container max-w-4xl pt-28 pb-16">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Radar className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Research tools</span>
              </div>
              <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Signal Scanner</h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Name an industry, niche, or idea. The engine mines what people are actually
                frustrated about across public sources (Hacker News + the web), clusters it, and
                ranks evidence-backed opportunities. For founders deciding what to build — and
                operators hunting inefficiencies inside a business.
              </p>
            </div>
          </div>

          {/* Topic-driven scan input */}
          <label htmlFor="signal-topic" className="block text-sm font-semibold mt-6">Industry, niche, or topic</label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              id="signal-topic"
              maxLength={300}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !scanning) runScan(); }}
              placeholder="e.g. third-party logistics, dental practices, indie SaaS tooling…"
              className="flex-1 min-w-[240px] rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <Button onClick={runScan} disabled={scanning||!topic.trim()} className="gap-2">
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {scanning ? "Scanning…" : topic.trim() ? "Scan this" : "Run scan"}
            </Button>
          </div>

          {/* Stat strip */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Collected", counts?.collected ?? "—"],
              ["Pain points", counts?.pain ?? "—"],
              ["Clusters", counts?.clusters ?? "—"],
              ["Candidates", counts?.candidates ?? visible.length],
            ].map(([label, value]) => (
              <Card key={label as string} className="p-3">
                <div className="font-display text-2xl font-extrabold leading-none">{value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
              </Card>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{usingSample ? "Illustrative sample · prepared golf-related examples, not a scan of your topic." : `Results for “${scanTopic}” · held in this view, not a public shared database.`} Generated paraphrases summarize discussion; they are not verbatim quotations. Scores are model estimates, not verified certainty.</p>
          {scanError&&<p role="alert" className="mt-4 text-destructive">{scanError}</p>}
          {scanWarnings.length>0&&<aside aria-label="Scan limitations" className="mt-4 text-sm"><strong>Partial coverage</strong><ul className="list-disc pl-5">{scanWarnings.map(w=><li key={w}>{w}</li>)}</ul></aside>}
          {!usingSample&&<Button variant="outline" className="mt-4" onClick={()=>downloadText(`# Signal scan: ${scanTopic}\n\n`+candidates.map(c=>`## ${c.cluster_theme}\n${c.problem}\n\n${c.proposed_solution}\n\nSources: ${(c.evidence.source_refs||[]).map(x=>x.url).join(', ')}`).join('\n\n'),'vibeco-signal-scan.md')}>Download this scan</Button>}

          {/* Trending themes (Pulse P1) */}
          {themes.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">Trending themes</h2>
                <span className="text-xs text-muted-foreground">{usingSample ? "Illustrative theme history · sample values" : "Themes from this scan"}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {themes.slice(0, 6).map((t, i) => {
                  const tl = trendLabel(t.trend);
                  return (
                    <Card key={(t.id ?? t.title) + i} className="flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-tight">{t.title}</span>
                        <Sparkline points={(t.score_history ?? []).map((p) => p.s)} />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`font-display text-lg font-extrabold ${painTone(t.pain_score)}`}>{Math.round(t.pain_score)}</span>
                        <span className={`font-semibold ${tl.cls}`}>{tl.icon} {t.trend > 0 ? "+" : ""}{t.trend}</span>
                        <span className="ml-auto text-muted-foreground">seen {t.occurrence_count}×</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidates */}
          <div className="mt-8 space-y-4">
            <h2 className="font-display text-lg font-bold">Feature candidates</h2>
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
                      <Badge variant="secondary">{c.confidence}% model estimate</Badge>
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
                      <p className="text-xs font-semibold">Generated paraphrases</p>
                      {c.representative_quotes.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <Quote className="h-3.5 w-3.5 shrink-0 opacity-60" /><span>{q}</span>
                        </div>
                      ))}
                      <div className="pt-1 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                        sources: {c.evidence.sources.join(" · ")}
                        {c.evidence.source_refs?.map(ref=><a key={ref.url} className="block normal-case text-primary underline mt-2 text-xs" href={ref.url} target="_blank" rel="noreferrer">{ref.title||ref.url} ↗</a>)}
                        {!c.evidence.source_refs?.length&&<span className="block normal-case">{usingSample?"No live evidence attached to this illustrative sample.":"Original source links unavailable; treat this finding as unverified."}</span>}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="gap-1.5" onClick={() => setStatus(realIdx, "promoted")}>
                      Explore this opportunity <ArrowUpRight className="h-3.5 w-3.5" />
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
