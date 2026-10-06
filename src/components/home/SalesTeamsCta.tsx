import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

/** The blue, shimmering way into the target-account workbench (/for/omni). */
const SalesTeamsCta = ({ className = "" }: { className?: string }) => (
  <Link
    to="/for/omni"
    aria-label="Sales Teams: build a first-call plan for a target account"
    className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-sales px-5 py-2.5 text-sm font-semibold text-sales-foreground shadow-[0_10px_28px_-10px_hsl(var(--sales)/0.75)] ring-1 ring-inset ring-white/15 transition hover:-translate-y-px hover:brightness-110 hover:shadow-[0_14px_32px_-10px_hsl(var(--sales)/0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sales focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/45 to-transparent"
    />
    <Sparkles size={15} className="relative" aria-hidden />
    <span className="relative">Sales Teams</span>
    <ArrowRight size={15} className="relative transition-transform group-hover:translate-x-0.5" aria-hidden />
  </Link>
);

export default SalesTeamsCta;
