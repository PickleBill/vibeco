import { useState, useRef } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import type { BriefData } from "./SimulatorShell";

interface Props {
  brief: BriefData;
  idea: string;
  onRestart: () => void;
  conceptImage?: string | null;
  logoImage?: string | null;
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

// Simple hash for deterministic scores
const hashStr = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const TeaserScores = ({ brief }: { brief: BriefData }) => {
  const scores = [
    { label: "Market", value: 60 + (hashStr(brief.problem) % 30) },
    { label: "Product", value: 55 + (hashStr(JSON.stringify(brief.core_features)) % 35) },
    { label: "Revenue", value: 60 + (hashStr(brief.revenue_model) % 30) },
    { label: "Timing", value: 50 + (hashStr(brief.industry_trends) % 35) },
  ];

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

const FinalReport = ({ brief, idea, onRestart, conceptImage, logoImage }: Props) => {
  const [email, setEmail] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setShowReport(true);
    toast.success("You're in! Here's your full report.");
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#0a0a0f",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      const pageContentHeight = pdfHeight - 20;
      const totalScaledPages = Math.ceil(scaledHeight / pageContentHeight);

      for (let page = 0; page < totalScaledPages; page++) {
        if (page > 0) pdf.addPage();
        const yOffset = -(page * pageContentHeight) + 10;
        pdf.addImage(imgData, "PNG", (pdfWidth - scaledWidth) / 2, yOffset, scaledWidth, scaledHeight);
      }

      const fileName = `VibeCo-Report-${idea.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      pdf.save(fileName);
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. Try again.");
    } finally {
      setIsExporting(false);
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
          {/* Visual teaser — blurred preview strip */}
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
              {/* Viability scores teaser */}
              <TeaserScores brief={brief} />

              {/* Blurred section previews */}
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
                {/* Fade-out overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/80 pointer-events-none" />
              </div>
            </div>

            {/* Lock overlay */}
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
                className="flex items-center gap-2 bg-primary text-primary-foreground font-mono text-sm px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
              >
                <Mail size={14} />
                Unlock
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
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

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
