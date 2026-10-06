import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * The way into the target-account workbench (/for/omni). It sits in the hero's
 * question-type row, sized like the chips, filled teal with a faint shimmer so it
 * reads as the one action in the row.
 */
const SalesTeamsCta = ({ className = "" }: { className?: string }) => (
  <Link
    to="/for/omni"
    title="First-call plans for target accounts, from public sources"
    aria-label="Sales Teams: build a first-call plan for a target account"
    className={`group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border border-primary bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-[0_6px_16px_-8px_hsl(var(--primary)/0.7)] transition hover:-translate-y-px hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${className}`}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent motion-reduce:hidden"
    />
    <span className="relative">Sales Teams</span>
    <ArrowRight size={13} className="relative transition-transform group-hover:translate-x-0.5" aria-hidden />
  </Link>
);

export default SalesTeamsCta;
