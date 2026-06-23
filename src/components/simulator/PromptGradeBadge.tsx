import { motion } from "framer-motion";
import { Loader2, ShieldCheck, ShieldAlert, ShieldX, Wrench } from "lucide-react";

export interface GradeAntiPattern {
  name: string;
  where: string;
  fix: string;
}

export interface PromptGrade {
  scores: {
    context_goals: number;
    specificity: number;
    design_tokens: number;
    mobile_first: number;
    state_error_handling: number;
    avoiding_defaults: number;
  };
  overall: number;
  anti_patterns_found: GradeAntiPattern[];
  top_fixes: string[];
}

const DIMENSION_LABELS: { key: keyof PromptGrade["scores"]; label: string }[] = [
  { key: "context_goals", label: "Context & goals" },
  { key: "specificity", label: "Specificity" },
  { key: "design_tokens", label: "Design tokens" },
  { key: "mobile_first", label: "Mobile-first" },
  { key: "state_error_handling", label: "State / errors" },
  { key: "avoiding_defaults", label: "Avoids defaults" },
];

/** Color band for a 0-10 score. emerald ≥8 · amber 5–7 · red <5 */
function band(score: number) {
  if (score >= 8) {
    return {
      text: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/30",
      Icon: ShieldCheck,
      bar: "bg-primary",
    };
  }
  if (score >= 5) {
    return {
      text: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/30",
      Icon: ShieldAlert,
      bar: "bg-warning",
    };
  }
  return {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    Icon: ShieldX,
    bar: "bg-destructive",
  };
}

interface Props {
  grade: PromptGrade | null;
  loading: boolean;
  /** "Improve this prompt" action — closes the grade→refine loop. */
  onImprove?: () => void;
  improving?: boolean;
}

const PromptGradeBadge = ({ grade, loading, onImprove, improving }: Props) => {
  if (loading && !grade) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/40 bg-muted/15 mb-3">
        <Loader2 size={13} className="animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-mono">Grading prompt strength…</span>
      </div>
    );
  }

  if (!grade) return null;

  const overall = Math.round(grade.overall * 10) / 10;
  const b = band(overall);
  const { Icon } = b;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-3 rounded-lg border ${b.border} ${b.bg} overflow-hidden`}
    >
      {/* Header row: score + improve */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={15} className={`${b.text} shrink-0`} />
          <span className={`text-xs font-mono font-semibold ${b.text} whitespace-nowrap`}>
            Prompt strength: {overall}/10
          </span>
          {loading && <Loader2 size={12} className="animate-spin text-muted-foreground" />}
        </div>
        {onImprove && (
          <button
            onClick={onImprove}
            disabled={improving}
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {improving ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
            {improving ? "Improving…" : "Improve this prompt"}
          </button>
        )}
      </div>

      {/* Dimension bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 px-4 pb-3">
        {DIMENSION_LABELS.map(({ key, label }) => {
          const v = grade.scores[key] ?? 0;
          const db = band(v);
          return (
            <div key={key} className="min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</span>
                <span className={`text-[10px] font-mono ${db.text}`}>{v}</span>
              </div>
              <div className="h-1 rounded-full bg-border/40 overflow-hidden">
                <div className={`h-full rounded-full ${db.bar}`} style={{ width: `${Math.max(0, Math.min(10, v)) * 10}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Anti-patterns / fixes */}
      {grade.anti_patterns_found.length > 0 && (
        <div className="border-t border-border/30 px-4 py-2.5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {grade.anti_patterns_found.length} issue{grade.anti_patterns_found.length > 1 ? "s" : ""} to fix
          </p>
          {grade.anti_patterns_found.slice(0, 5).map((ap, i) => (
            <div key={i} className="text-xs leading-relaxed">
              <span className="font-semibold text-foreground/90">{ap.name}</span>
              <span className="text-muted-foreground"> — {ap.fix}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PromptGradeBadge;
