import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  Eye,
  MessageSquare,
  Mail,
  RotateCcw,
  Download,
  ImageIcon,
  ArrowLeft,
  Lock,
  Copy,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { BriefData, QuestionData } from "./SimulatorShell";

interface RoundState {
  brief: BriefData;
  questions: QuestionData[];
  answers?: Record<number, { selected: string[]; freeText?: string }>;
}

interface Props {
  brief: BriefData;
  idea: string;
  onRestart: () => void;
  conceptImage?: string | null;
  logoImage?: string | null;
  rounds: RoundState[];
  unlocked?: boolean;
  unlockEmail?: string;
  lovablePrompt?: string | null;
  sessionId?: string;
  highlights?: Set<string>;
  reportId?: string | null;
}

const sectionMeta = [
  { key: "problem", label: "Problem / Opportunity", icon: AlertTriangle },
  { key: "target_customer", label: "Target Customer", icon: Users },
  { key: "core_features", label: "Core Features", icon: Layers },
  { key: "revenue_model", label: "Revenue Model", icon: DollarSign },
  { key: "industry_trends", label: "Industry & Competitors", icon: TrendingUp },
  { key: "investor_perspective", label: "Investor Perspective & Next Steps", icon: Eye },
  { key: "customer_perspective", label: "Customer Perspective", icon: MessageSquare },
] as const;

const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const computeScores = (brief: BriefData) => [
  { label: "Market", value: 60 + (hashStr(brief.problem) % 30) },
  { label: "Product", value: 55 + (hashStr(JSON.stringify(brief.core_features)) % 35) },
  { label: "Revenue", value: 60 + (hashStr(brief.revenue_model) % 30) },
  { label: "Timing", value: 50 + (hashStr(brief.industry_trends) % 35) },
];

const TeaserScores = ({ brief }: { brief: BriefData }) => {
  const scores = computeScores(brief);

  return (
    <div className="flex items-center gap-6 justify-center py-3">
      {scores.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="relative w-10 h-10">
            <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="2.5"
              />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${s.value}, 100` }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold text-foreground">
              {s.value}
            </span>
          </div>
          <span className="font-mono text-[8px] text-muted-foreground">{s.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

/* ─── Structured PDF Export ─── */
export const generateStructuredPDF = (
  brief: BriefData,
  idea: string,
  rounds: RoundState[],
  scores: { label: string; value: number }[],
  lovablePrompt?: string | null
) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pw - margin * 2;
  let y = 0;

  const addHeader = () => {
    pdf.setFillColor(17, 17, 17);
    pdf.rect(0, 0, pw, ph, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 200);
    pdf.text("VibeCo AI Report", margin, 12);
    const pageNum = `Page ${pdf.getNumberOfPages()}`;
    pdf.text(pageNum, pw - margin - pdf.getTextWidth(pageNum), 12);
    pdf.setDrawColor(50, 50, 60);
    pdf.line(margin, 15, pw - margin, 15);
  };

  const ensureSpace = (need: number) => {
    if (y + need > ph - 15) {
      pdf.addPage();
      addHeader();
      y = 25;
    }
  };

  const writeWrapped = (text: string, x: number, maxW: number, size: number, color: [number, number, number]) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, maxW);
    lines.forEach((line: string) => {
      ensureSpace(size * 0.5);
      pdf.text(line, x, y);
      y += size * 0.45;
    });
    y += 2;
  };

  // Page 1: Cover
  addHeader();
  y = 50;
  pdf.setFontSize(28);
  pdf.setTextColor(230, 230, 240);
  const titleLines = pdf.splitTextToSize(idea, contentW);
  titleLines.forEach((line: string) => {
    pdf.text(line, margin, y);
    y += 12;
  });
  y += 10;
  pdf.setFontSize(10);
  pdf.setTextColor(120, 120, 140);
  pdf.text(`Generated ${new Date().toLocaleDateString()} · ${rounds.length} rounds of analysis`, margin, y);
  y += 20;

  scores.forEach((s) => {
    pdf.setFontSize(10);
    pdf.setTextColor(180, 180, 200);
    pdf.text(`${s.label}:`, margin, y);
    pdf.setFillColor(40, 40, 50);
    pdf.roundedRect(margin + 25, y - 3.5, 60, 5, 2, 2, "F");
    pdf.setFillColor(120, 120, 200);
    pdf.roundedRect(margin + 25, y - 3.5, 60 * (s.value / 100), 5, 2, 2, "F");
    pdf.setTextColor(200, 200, 220);
    pdf.text(`${s.value}`, margin + 90, y);
    y += 9;
  });

  pdf.addPage();
  addHeader();
  y = 25;

  sectionMeta.forEach((section) => {
    ensureSpace(20);
    pdf.setFontSize(12);
    pdf.setTextColor(120, 120, 200);
    pdf.text(section.label.toUpperCase(), margin, y);
    y += 7;
    pdf.setDrawColor(60, 60, 80);
    pdf.line(margin, y - 2, margin + contentW, y - 2);
    y += 2;

    const val = brief[section.key as keyof BriefData];
    if (section.key === "core_features" && Array.isArray(val)) {
      (val as BriefData["core_features"]).forEach((feat, fi) => {
        ensureSpace(12);
        const strength = 60 + (hashStr(feat.name + fi) % 35);
        pdf.setFontSize(10);
        pdf.setTextColor(210, 210, 225);
        pdf.text(`${fi + 1}. ${feat.name}`, margin + 2, y);
        y += 5;
        writeWrapped(feat.description, margin + 6, contentW - 6, 9, [160, 160, 175]);
        pdf.setFillColor(40, 40, 50);
        pdf.roundedRect(margin + 6, y - 1, 50, 3, 1, 1, "F");
        pdf.setFillColor(100, 100, 180);
        pdf.roundedRect(margin + 6, y - 1, 50 * (strength / 100), 3, 1, 1, "F");
        pdf.setFontSize(7);
        pdf.setTextColor(130, 130, 150);
        pdf.text(`${strength}%`, margin + 60, y + 1.5);
        y += 7;
      });
    } else {
      writeWrapped(val as string, margin + 2, contentW - 2, 9.5, [200, 200, 215]);
    }
    y += 5;
  });

  if (rounds.length > 1) {
    pdf.addPage();
    addHeader();
    y = 25;
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 200);
    pdf.text("REFINEMENT JOURNEY", margin, y);
    y += 10;

    rounds.forEach((r, ri) => {
      ensureSpace(15);
      pdf.setFontSize(11);
      pdf.setTextColor(200, 200, 220);
      pdf.text(`Round ${ri + 1}`, margin, y);
      y += 6;
      if (r.answers) {
        r.questions.forEach((q, qi) => {
          const a = r.answers![qi];
          if (a) {
            writeWrapped(`Q: ${q.question}`, margin + 4, contentW - 4, 8.5, [150, 150, 165]);
            writeWrapped(`A: ${a.selected.join(", ")}${a.freeText ? ` — ${a.freeText}` : ""}`, margin + 4, contentW - 4, 8.5, [180, 180, 200]);
          }
        });
      }
      y += 4;
    });
  }

  if (lovablePrompt) {
    pdf.addPage();
    addHeader();
    y = 25;
    pdf.setFontSize(14);
    pdf.setTextColor(120, 120, 200);
    pdf.text("LOVABLE PROMPT — ONE-SHOT LANDING PAGE", margin, y);
    y += 10;
    writeWrapped(lovablePrompt, margin, contentW, 9, [190, 190, 205]);
  }

  const fileName = `VibeCo-Report-${idea.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
  pdf.save(fileName);
};

const FinalReport = ({ brief, idea, onRestart, conceptImage, logoImage, rounds, unlocked, unlockEmail, lovablePrompt, sessionId, highlights }: Props) => {
  const [email, setEmail] = useState(unlockEmail || "");
  const [showReport, setShowReport] = useState(!!unlocked);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [deepDiveContent, setDeepDiveContent] = useState<Record<string, string>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scores = computeScores(brief);

  const handleDeepDive = async (sectionKey: string) => {
    // Toggle off if already expanded
    if (expandedSection === sectionKey) {
      setExpandedSection(null);
      return;
    }

    setExpandedSection(sectionKey);

    // If already loaded, just show it
    if (deepDiveContent[sectionKey]) return;

    // Fetch deep dive
    setDeepDiveLoading(sectionKey);
    try {
      const sectionLabel = sectionMeta.find((s) => s.key === sectionKey)?.label || sectionKey;
      const { data, error } = await supabase.functions.invoke("simulate-idea", {
        body: {
          type: "deep_dive",
          section: sectionKey,
          section_label: sectionLabel,
          brief,
          idea,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDeepDiveContent((prev) => ({
        ...prev,
        [sectionKey]: data.deep_dive || "No additional analysis available.",
      }));
    } catch (e) {
      console.error("Deep dive error:", e);
      toast.error("Failed to generate deep dive. Try again.");
      setExpandedSection(null);
    } finally {
      setDeepDiveLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setIsSubmitting(true);
    try {
      const upsertData: Record<string, unknown> = {
        email: email.trim(),
        idea: idea.trim(),
        rounds: rounds.map((r: any) => ({
          brief: r.brief,
          questions: r.questions,
          answers: r.answers || null,
        })),
        concept_image_url: conceptImage || null,
        logo_image_url: logoImage || null,
      };
      if (sessionId) upsertData.id = sessionId;

      const { error } = await (supabase.from as any)("simulator_captures").upsert(upsertData, { onConflict: "id" });
      if (error) throw error;
      setShowReport(true);
      toast.success("You're in! Here's your full report.");
    } catch (err) {
      console.error("Simulator capture error:", err);
      setShowReport(true);
      toast.success("Here's your full report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = () => {
    setIsExporting(true);
    try {
      generateStructuredPDF(brief, idea, rounds, scores, lovablePrompt);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. Try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!lovablePrompt) return;
    try {
      await navigator.clipboard.writeText(lovablePrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy. Try selecting the text manually.");
    }
  };

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <p className="font-mono text-sm text-primary uppercase tracking-widest mb-3">
          Simulation Complete
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-3">
          Your Breakout Idea
        </h2>
        <p className="font-mono text-xs text-muted-foreground max-w-md mx-auto">
          Three rounds of refinement distilled into one actionable summary.
        </p>
      </motion.div>

      {!showReport ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-lg mx-auto"
        >
          {/* Visual teaser */}
          <div className="mb-6 rounded-lg overflow-hidden border border-primary/20 relative"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
          >
            {conceptImage && (
              <img
                src={conceptImage}
                alt="AI concept visualization"
                className="w-full h-36 object-cover"
                style={{ filter: "blur(6px) brightness(0.7)" }}
              />
            )}
            <div className={`${conceptImage ? "" : "pt-4"} px-5 pb-4 bg-card/80 backdrop-blur-sm`}>
              <TeaserScores brief={brief} />
              <div className="mt-3 space-y-2 relative">
                {sectionMeta.slice(0, 3).map((section) => {
                  const Icon = section.icon;
                  const val = brief[section.key as keyof BriefData];
                  const text = typeof val === "string" ? val : JSON.stringify(val);
                  return (
                    <div key={section.key} className="flex items-start gap-2">
                      <Icon size={12} className="text-primary mt-0.5 shrink-0" />
                      <p className="font-mono text-xs text-foreground/60 leading-relaxed truncate">
                        <span className="font-bold text-foreground/80">{section.label}:</span>{" "}
                        {text.slice(0, 60)}…
                      </p>
                    </div>
                  );
                })}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80 pointer-events-none" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-primary/30">
                <Lock size={12} className="text-primary" />
                <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider">
                  Full Report Inside
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-lg bg-card/60 backdrop-blur-sm border border-primary/30 mb-5"
            style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.1)" }}
          >
            <p className="font-mono text-sm text-foreground/80 leading-relaxed">
              <span className="text-primary font-bold">"{idea.slice(0, 80)}{idea.length > 80 ? "…" : ""}"</span>
              <br /><br />
              We've analyzed your idea across 7 dimensions and refined it through strategic questioning.
              Enter your email to unlock the full report.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit}>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-sm bg-card/40 border border-border/50 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Mail size={14} />
                {isSubmitting ? "..." : "Unlock"}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => navigate("/#contact")}
              className="font-mono text-xs text-primary hover:underline"
            >
              Or talk to us about building this →
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>

          <div ref={reportRef}>
            <div className="text-center mb-6 p-6">
              {logoImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 flex justify-center"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-primary/20 bg-card/60"
                    style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15)" }}
                  >
                    <img
                      src={logoImage}
                      alt="AI-generated product mark"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              )}
              <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-1">VibeCo AI Report</p>
              <h3 className="font-display text-xl font-bold text-foreground">
                {idea.slice(0, 60)}{idea.length > 60 ? "..." : ""}
              </h3>
            </div>

            {conceptImage && (
              <div className="mb-6 rounded-lg overflow-hidden border border-border/30">
                <div className="relative">
                  <img
                    src={conceptImage}
                    alt="Product concept"
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
                    <ImageIcon size={10} className="text-primary" />
                    <span className="font-mono text-[9px] text-muted-foreground">Product Vision</span>
                  </div>
                </div>
              </div>
            )}

            <div
              className="p-px rounded-lg mb-8"
              style={{
                background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2))",
              }}
            >
              <div className="p-8 rounded-lg bg-background">
                <div className="grid gap-6">
                  {sectionMeta.map((section, i) => {
                    const Icon = section.icon;
                    const value = brief[section.key as keyof BriefData];
                    const isExpanded = expandedSection === section.key;
                    const isLoadingThis = deepDiveLoading === section.key;
                    const hasContent = !!deepDiveContent[section.key];

                    return (
                      <motion.div
                        key={section.key}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.06 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} className="text-primary" />
                          <h4 className="font-display text-xs font-bold text-foreground uppercase tracking-wide">
                            {section.label}
                          </h4>
                          {highlights?.has(section.key) && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 font-mono text-[8px] text-primary">
                              <Sparkles size={8} className="fill-primary" />
                              Highlighted
                            </span>
                          )}
                        </div>
                        {section.key === "core_features" && Array.isArray(value) ? (
                          <div className="grid gap-1.5 ml-5">
                            {(value as BriefData["core_features"]).map((feat, fi) => (
                              <p key={fi} className="font-mono text-sm text-foreground/80">
                                <span className="text-primary font-bold">{fi + 1}.</span>{" "}
                                <span className="font-semibold">{feat.name}</span> — {feat.description}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="font-mono text-sm text-foreground/80 leading-relaxed ml-5">
                            {value as string}
                          </p>
                        )}

                        {/* Deep Dive button */}
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleDeepDive(section.key)}
                            disabled={isLoadingThis}
                            className={`flex items-center gap-1.5 font-mono text-[10px] transition-colors px-2 py-1 rounded disabled:opacity-50 ${
                              highlights?.has(section.key)
                                ? "text-primary hover:bg-primary/10 font-semibold"
                                : "text-muted-foreground hover:text-primary hover:bg-muted/30"
                            }`}
                          >
                            {isLoadingThis ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <ChevronDown
                                size={10}
                                className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            )}
                            {isLoadingThis
                              ? "Analyzing..."
                              : isExpanded
                              ? "Collapse"
                              : highlights?.has(section.key)
                              ? "Deep dive ✦"
                              : "Deep dive"}
                          </button>
                        </div>

                        {/* Deep Dive content */}
                        <AnimatePresence>
                          {isExpanded && (isLoadingThis || hasContent) && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 ml-5 pl-4 border-l-2 border-primary/30">
                                {isLoadingThis && !hasContent ? (
                                  <div className="space-y-2 py-2">
                                    {[1, 2, 3, 4].map((n) => (
                                      <div
                                        key={n}
                                        className="h-3 rounded bg-muted animate-pulse"
                                        style={{ width: `${60 + n * 8}%` }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="prose prose-sm prose-invert max-w-none py-2">
                                    <ReactMarkdown
                                      components={{
                                        p: ({ children }) => (
                                          <p className="font-mono text-xs text-foreground/70 leading-relaxed mb-2">
                                            {children}
                                          </p>
                                        ),
                                        ul: ({ children }) => (
                                          <ul className="space-y-1.5 mb-2">{children}</ul>
                                        ),
                                        li: ({ children }) => (
                                          <li className="font-mono text-xs text-foreground/70 leading-relaxed flex gap-2">
                                            <span className="text-primary mt-0.5 shrink-0">•</span>
                                            <span>{children}</span>
                                          </li>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="text-foreground/90 font-semibold">
                                            {children}
                                          </strong>
                                        ),
                                      }}
                                    >
                                      {deepDiveContent[section.key]}
                                    </ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Lovable Prompt — subtle, at the bottom */}
          {lovablePrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mb-8"
            >
              {highlights && highlights.size > 0 && (
                <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                  <Sparkles size={12} className="text-primary fill-primary" />
                  <span className="font-mono text-[10px] text-primary">
                    Personalized based on {highlights.size} area{highlights.size > 1 ? "s" : ""} you highlighted
                  </span>
                </div>
              )}
              <div className="border border-border/30 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/20">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    One-shot prompt — paste into Lovable to build your landing page
                  </span>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                  >
                    {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-4 max-h-40 overflow-y-auto">
                  <pre className="font-mono text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {lovablePrompt}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate("/#contact")}
              className="font-mono text-sm bg-primary text-primary-foreground px-6 py-3 rounded-sm hover:opacity-90 transition-opacity"
            >
              Let's Build This →
            </button>
            <button
              onClick={onRestart}
              className="flex items-center gap-2 font-mono text-sm border border-border text-foreground px-6 py-3 rounded-sm hover:border-primary/50 transition-colors"
            >
              <RotateCcw size={14} />
              Simulate Another Idea
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 font-mono text-sm text-muted-foreground px-6 py-3 rounded-sm hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Home
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default FinalReport;
