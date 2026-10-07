import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { MODULES, nextStep, type ModuleId } from "./nav";
import { cx, secondaryButton } from "./style";

/**
 * "What next" at the foot of a view: the next step in the story for the
 * account in hand, one quiet row. Hidden in the ?demo walkthrough, whose bar
 * already has its own Next.
 */
export function NextStep({ seller, from, account, className }: { seller: string; from: ModuleId; account?: { id: string; name: string }; className?: string }) {
  const { search } = useLocation();
  const next = nextStep(seller, from, account);
  if (!next || new URLSearchParams(search).has("demo")) return null;
  const view = MODULES.find((m) => m.id === next.to);
  return (
    <nav aria-label="Next step" className={cx("mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-border pt-5", className)}>
      <p className="font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        Next · {view?.idx} {view?.label}
      </p>
      <Link to={next.href} className={cx(secondaryButton, "w-full text-[15px] sm:w-auto")}>
        {next.label} <ArrowRight size={16} aria-hidden />
      </Link>
    </nav>
  );
}
