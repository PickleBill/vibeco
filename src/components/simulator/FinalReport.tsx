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
  Copy,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  Share2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ThunderdomePanel from "./ThunderdomePanel";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  onToggleHighlight?: (key: string) => void;
  antiHighlights?: Set<string>;
  onToggleAntiHighlight?: (key: string) => void;
  reportId?: string | null;
  onReorderFeatures?: (features: BriefData["core_features"]) => void;
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

/* ─── Sortable Feature ─── */
const SortableFeature = ({ feat, index, id }: { feat: { name: string; description: string }; index: number; id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 group/feat">
      <button {...attributes} {...listeners} className="mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-primary transition-colors touch-none">
        <GripVertical size={14} />
      </button>
      <p className="font-mono text-base text-foreground/90 leading-relaxed">
        <span className="text-primary font-bold">{index + 1}.</span>{" "}
        <span className="font-semibold">{feat.name}</span> — {feat.description}
      </p>
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
    } else if (typeof val === "string") {
      writeWrapped(val, margin + 2, contentW - 2, 9.5, [200, 200, 215]);
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

const FinalReport = ({ brief, idea, onRestart, conceptImage, logoImage, rounds, unlocked, unlockEmail, lovablePrompt, sessionId, highlights, onToggleHighlight, antiHighlights, onToggleAntiHighlight, reportId, onReorderFeatures }: Props) => {
  const [email, setEmail] = useState(unlockEmail || "");
  const [showPrompt, setShowPrompt] = useState(!!unlocked);
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [deepDiveContent, setDeepDiveContent] = useState<Record<string, string>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scores = computeScores(brief);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDeepDive = async (sectionKey: string) => {
    if (expandedSection === sectionKey) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(sectionKey);
    if (deepDiveContent[sectionKey]) return;

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
      setShowPrompt(true);
      toast.success("Saved! Your prompt and sharing tools are unlocked.");
    } catch (err) {
      console.error("Simulator capture error:", err);
      setShowPrompt(true);
      toast.success("Unlocked!");
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

  const handleCopyPromptWithHighlights = async () => {
    if (!lovablePrompt) return;
    let textToCopy = lovablePrompt;

    if (highlights && highlights.size > 0) {
      textToCopy += "\n\n---\n\n## Areas that resonate most with me:\n";
      highlights.forEach((key) => {
        const section = sectionMeta.find((s) => s.key === key);
        if (!section) return;
        const value = brief[section.key as keyof BriefData];
        const text = typeof value === "string" ? value : Array.isArray(value) ? (value as BriefData["core_features"]).map((f) => `${f.name}: ${f.description}`).join("\n") : "";
        textToCopy += `\n### ${section.label}\n${text}\n`;
      });
    }

    if (antiHighlights && antiHighlights.size > 0) {
      textToCopy += "\n\n## Areas to deprioritize or reframe:\n";
      antiHighlights.forEach((key) => {
        const section = sectionMeta.find((s) => s.key === key);
        if (!section) return;
        textToCopy += `- ${section.label}\n`;
      });
    }

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopied(true);
      toast.success("Prompt copied!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Failed to copy.");
    }
  };

  const handleShareReport = async () => {
    if (!reportId) {
      toast.error("Report is still saving. Try again in a moment.");
      return;
    }
    const shareUrl = `${window.location.origin}/report/${reportId}`;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setShareCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setShareCopied(false), 2000);
    } else {
      toast.error("Failed to copy link.");
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorderFeatures) {
      const features = brief.core_features;
      const oldIndex = features.findIndex((_, i) => `feature-${i}` === active.id);
      const newIndex = features.findIndex((_, i) => `feature-${i}` === over.id);
      onReorderFeatures(arrayMove(features, oldIndex, newIndex));
    }
  };

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <p className="font-mono text-sm text-primary uppercase tracking-widest mb-3">
          Simulation Complete
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-black text-foreground mb-3">
          Your Breakout Idea
        </h2>
        <p className="font-mono text-sm text-muted-foreground max-w-md mx-auto">
          Three rounds of refinement distilled into one actionable summary.
        </p>
      </motion.div>

      {/* Email banner at top — always visible until submitted */}
      {!showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-lg border border-primary/30 bg-primary/5"
          style={{ boxShadow: "0 0 24px hsl(var(--primary) / 0.08)" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-display text-sm font-bold text-foreground">Save your report & unlock the prompt</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Get your shareable link, PDF download, and one-shot Lovable prompt.
              </p>
            </div>
            <form onSubmit={handleEmailSubmit} className="flex gap-2 w-full sm:w-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 sm:w-52 px-3 py-2 rounded-sm bg-background border border-border font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-4 py-2 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
              >
                <Mail size={14} />
                {isSubmitting ? "..." : "Unlock"}
              </button>
            </form>
          </div>
        </motion.div>
      )}

      {/* Full report — always visible */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Action buttons */}
        {showPrompt && (
          <div className="flex flex-wrap gap-2 justify-end mb-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              {isExporting ? "Generating..." : "Download PDF"}
            </button>
            <button
              onClick={handleShareReport}
              className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-sm border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
            >
              {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
              {shareCopied ? "Link Copied!" : "Share Report"}
            </button>
          </div>
        )}

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
                  <img src={logoImage} alt="AI-generated product mark" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            )}
            <p className="font-mono text-xs text-primary uppercase tracking-widest mb-1">VibeCo AI Report</p>
            <h3 className="font-display text-xl font-bold text-foreground">
              {idea.slice(0, 60)}{idea.length > 60 ? "..." : ""}
            </h3>
          </div>

          {conceptImage && (
            <div className="mb-6 rounded-lg overflow-hidden border border-border/30">
              <div className="relative">
                <img src={conceptImage} alt="Product concept" className="w-full h-48 sm:h-64 object-cover" />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
                  <ImageIcon size={10} className="text-primary" />
                  <span className="font-mono text-[10px] text-muted-foreground">Product Vision</span>
                </div>
              </div>
            </div>
          )}

          {/* Scale assessment */}
          {brief.scale_assessment && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-6 p-4 rounded-lg border ${
                brief.scale_assessment.fits_intent
                  ? "border-primary/30 bg-primary/5"
                  : "border-yellow-500/30 bg-yellow-500/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${
                  brief.scale_assessment.fits_intent
                    ? "bg-primary/15 text-primary"
                    : "bg-yellow-500/15 text-yellow-500"
                }`}>
                  {brief.scale_assessment.fits_intent ? "✓" : "⚖️"}
                </div>
                <div>
                  <p className={`font-mono text-xs font-bold ${
                    brief.scale_assessment.fits_intent ? "text-primary" : "text-yellow-500"
                  }`}>
                    Scale: {brief.scale_assessment.current_scale.charAt(0).toUpperCase() + brief.scale_assessment.current_scale.slice(1)}
                    {brief.scale_assessment.fits_intent ? " — matches your intent" : " — might not match your intent"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
                    {brief.scale_assessment.recommendation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Builder intent badge */}
          {brief.builder_intent && (
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 font-mono text-[11px] text-accent">
                Building for: {
                  brief.builder_intent === 'experiment' ? '🧪 Quick experiment' :
                  brief.builder_intent === 'community' ? '👥 Community project' :
                  brief.builder_intent === 'lead-magnet' ? '🎯 Lead generation' :
                  brief.builder_intent === 'lifestyle' ? '☀️ Lifestyle business' :
                  brief.builder_intent === 'venture' ? '🚀 Venture-scale startup' :
                  brief.builder_intent === 'fun' ? '🎮 Just for fun' :
                  brief.builder_intent
                }
              </span>
            </div>
          )}

          <div
            className="p-px rounded-lg mb-8"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2))",
            }}
          >
            <div className="p-6 sm:p-8 rounded-lg bg-background">
              <div className="grid gap-6">
                {sectionMeta.map((section, i) => {
                  const Icon = section.icon;
                  const value = brief[section.key as keyof BriefData];
                  const isExpanded = expandedSection === section.key;
                  const isLoadingThis = deepDiveLoading === section.key;
                  const hasContent = !!deepDiveContent[section.key];
                  const isHighlighted = highlights?.has(section.key);
                  const isAntiHighlighted = antiHighlights?.has(section.key);

                  return (
                    <motion.div
                      key={section.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-primary" />
                        <h4 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">
                          {section.label}
                        </h4>
                        {/* Highlight toggles */}
                        {onToggleHighlight && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => onToggleHighlight(section.key)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] transition-all ${
                                isHighlighted
                                  ? "bg-primary/20 border border-primary/40 text-primary"
                                  : "border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary/80"
                              }`}
                            >
                              <Sparkles size={10} className={isHighlighted ? "fill-primary" : ""} />
                              {isHighlighted ? "Resonates" : "This resonates"}
                            </button>
                            {onToggleAntiHighlight && (
                              <button
                                onClick={() => onToggleAntiHighlight(section.key)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] transition-all ${
                                  isAntiHighlighted
                                    ? "bg-destructive/15 border border-destructive/40 text-destructive"
                                    : "border border-border/50 text-muted-foreground hover:border-destructive/30 hover:text-destructive/80"
                                }`}
                              >
                                ✕
                                {isAntiHighlighted ? "Flagged" : "Not quite"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Core features with drag reorder */}
                      {section.key === "core_features" && Array.isArray(value) ? (
                        <div className="ml-5">
                          {onReorderFeatures ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                              <SortableContext items={(value as BriefData["core_features"]).map((_, i) => `feature-${i}`)} strategy={verticalListSortingStrategy}>
                                <div className="grid gap-2">
                                  {(value as BriefData["core_features"]).map((feat, fi) => (
                                    <SortableFeature key={`feature-${fi}`} feat={feat} index={fi} id={`feature-${fi}`} />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          ) : (
                            <div className="grid gap-2">
                              {(value as BriefData["core_features"]).map((feat, fi) => (
                                <p key={fi} className="font-mono text-base text-foreground/90 leading-relaxed">
                                  <span className="text-primary font-bold">{fi + 1}.</span>{" "}
                                  <span className="font-semibold">{feat.name}</span> — {feat.description}
                                </p>
                              ))}
                            </div>
                          )}
                          {onReorderFeatures && (
                            <p className="font-mono text-[10px] text-muted-foreground/50 mt-2">
                              Drag to reorder by priority · #1 gets hero placement in your Lovable prompt
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-mono text-base text-foreground/90 leading-relaxed ml-5">
                          {typeof value === "string" ? value : ""}
                        </p>
                      )}

                      {/* Deep Dive button */}
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleDeepDive(section.key)}
                          disabled={isLoadingThis}
                          className={`flex items-center gap-1.5 font-mono text-xs transition-colors px-2 py-1 rounded disabled:opacity-50 ${
                            isHighlighted
                              ? "text-primary hover:bg-primary/10 font-semibold"
                              : "text-muted-foreground hover:text-primary hover:bg-muted/30"
                          }`}
                        >
                          {isLoadingThis ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ChevronDown
                              size={12}
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            />
                          )}
                          {isLoadingThis
                            ? "Analyzing..."
                            : isExpanded
                            ? "Collapse"
                            : isHighlighted
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
                                        <p className="font-mono text-sm text-foreground/80 leading-relaxed mb-2">
                                          {children}
                                        </p>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="space-y-1.5 mb-2">{children}</ul>
                                      ),
                                      li: ({ children }) => (
                                        <li className="font-mono text-sm text-foreground/80 leading-relaxed flex gap-2">
                                          <span className="text-primary mt-0.5 shrink-0">•</span>
                                          <span>{children}</span>
                                        </li>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="text-foreground font-semibold">
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

        {/* Thunderdome — appears after email unlock */}
        {showPrompt && (
          <ThunderdomePanel
            brief={brief}
            idea={idea}
            reportId={reportId}
            highlights={highlights}
            antiHighlights={antiHighlights}
          />
        )}

        {/* Lovable Prompt — visible after email unlock */}
        {showPrompt && lovablePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            {highlights && highlights.size > 0 && (
              <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles size={12} className="text-primary fill-primary" />
                <span className="font-mono text-xs text-primary">
                  Personalized based on {highlights.size} area{highlights.size > 1 ? "s" : ""} you highlighted
                </span>
              </div>
            )}
            <div className="border border-border/30 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/20">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  One-shot prompt — paste into Lovable to build your landing page
                </span>
                <button
                  onClick={handleCopyPromptWithHighlights}
                  className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                >
                  {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                  {copied ? "Copied" : highlights && highlights.size > 0 ? "Copy + highlights" : "Copy"}
                </button>
              </div>
              <div className="p-4 max-h-48 overflow-y-auto">
                <pre className="font-mono text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {lovablePrompt}
                </pre>
              </div>
            </div>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 font-mono text-sm text-muted-foreground px-6 py-3 rounded-sm hover:text-foreground transition-colors"
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
    </div>
  );
};

export default FinalReport;
