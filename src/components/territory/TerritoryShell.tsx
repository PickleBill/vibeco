import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import type { SellerConfig } from "@/lib/sellers";
import { ranAt } from "@/components/account/explorer/savedRuns";
import type { TerritoryState } from "./useTerritory";
import { MODULES, moduleHref, type ModuleId } from "./nav";
import { cx } from "./style";
import { FieldPill, LivePill } from "./ui";

/** The account the walkthrough follows: the first saved run (Relay). */
const DEMO_STEPS: { id: ModuleId; text: string; next: string }[] = [
  { id: "radar", text: "The territory, re-checked", next: "Run an account live" },
  { id: "account", text: "One account, researched live", next: "Simulate its committee" },
  { id: "committee", text: "The buying room, before the meeting", next: "Build the Deal Room brief" },
  { id: "deal", text: "A brief the account can correct", next: "Find lookalikes" },
  { id: "lookalikes", text: "More like the customers who said yes", next: "Back to the radar" },
];

/**
 * The territory command center: a top bar, a rail of workbook tabs (left on
 * desktop, across the top on phones) and the current view. The seller's theme
 * goes on <html> while the page is open, so popovers and tooltips match.
 */
export function TerritoryShell({
  seller,
  module,
  territory,
  children,
}: {
  seller: SellerConfig;
  module: ModuleId;
  territory: TerritoryState;
  children: ReactNode;
}) {
  const theme = seller.theme;
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.classList.add(theme);
    return () => root.classList.remove(theme);
  }, [theme]);

  const total = seller.territory?.accounts.length ?? 0;
  const latest = territory.rows.reduce<string | null>((a, r) => (!a || r.ranAt > a ? r.ranAt : a), null);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-border bg-background px-4 py-3 sm:px-7">
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <Link to="/" className="font-display text-[21px] font-bold tracking-[-0.01em] text-foreground">
            VibeCo
          </Link>
          <span className="truncate text-[15px] text-[#4A4F63]">Territory Command Center</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FieldPill className="h-8 text-sm">
            Seller profile: {seller.name} <span className="text-xs font-normal text-muted-foreground">unofficial</span>
          </FieldPill>
          {seller.territory && (
            <FieldPill glyph="#" className="h-8 text-sm">
              {seller.territory.name} · {total} accounts
            </FieldPill>
          )}
          {latest && <LivePill className="hidden sm:inline-flex">Latest run {ranAt(latest)}</LivePill>}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <nav
          aria-label="Views"
          className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-border bg-muted px-3 pt-2.5 lg:w-[248px] lg:flex-col lg:gap-1 lg:overflow-visible lg:border-b-0 lg:border-r lg:py-6 lg:pl-3.5 lg:pr-0"
        >
          {MODULES.map((m) => {
            const on = m.id === module;
            return (
              <Link
                key={m.id}
                to={moduleHref(seller.id, m.id)}
                aria-current={on ? "page" : undefined}
                className={cx(
                  "flex min-h-11 shrink-0 items-center gap-3 whitespace-nowrap px-3.5 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-[58px] lg:whitespace-normal lg:text-base",
                  "rounded-t-[10px] lg:rounded-l-[10px] lg:rounded-tr-none",
                  on
                    ? "-mb-px border border-border border-b-background bg-background font-bold shadow-[inset_0_3px_0_hsl(var(--primary))] lg:-mr-px lg:mb-0 lg:border-b-border lg:border-r-background lg:shadow-[inset_3px_0_0_hsl(var(--primary))]"
                    : "border border-transparent font-medium text-[#4A4F63] hover:text-foreground",
                )}
              >
                <span className="font-mono text-xs font-medium text-muted-foreground">{m.idx}</span>
                <span className="flex min-w-0 flex-col">
                  <span>{m.label}</span>
                  <span className="hidden text-[13px] font-normal leading-snug text-muted-foreground lg:block">{m.hint}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-14 pt-6 sm:px-8 sm:pt-7">
          <DemoBar seller={seller} module={module} demoReportId={seller.territory?.accounts[0]?.reportId} />
          {children}
        </main>
      </div>

      <footer className="border-t border-border">
        <div className="flex flex-col gap-1.5 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p>
            {seller.footer} AI voices are synthetic.
          </p>
          <Link to="/" className="hover:text-foreground">
            Made with VibeCo
          </Link>
        </div>
      </footer>
    </div>
  );
}

/**
 * Presenter walkthrough (?demo): a dark bar naming the step and a Next button
 * that carries the demo account (the first saved run) through every view.
 */
function DemoBar({ seller, module, demoReportId }: { seller: SellerConfig; module: ModuleId; demoReportId?: string }) {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  if (!new URLSearchParams(search).has("demo")) return null;
  const i = Math.max(0, DEMO_STEPS.findIndex((s) => s.id === module));
  const step = DEMO_STEPS[i];
  const next = DEMO_STEPS[(i + 1) % DEMO_STEPS.length];
  const withAccount = next.id === "committee" || next.id === "deal";
  const nextHref = `${moduleHref(seller.id, next.id, withAccount ? demoReportId : undefined)}?demo`;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-foreground px-4 py-3 text-white">
      <span className="font-mono text-sm">
        Demo · step {i + 1} of {DEMO_STEPS.length} · {step.text}
      </span>
      <span className="flex items-center gap-2">
        <Link to={nextHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand bg-brand px-4 text-[15px] font-bold text-brand-foreground">
          {step.next} <ArrowRight size={16} aria-hidden />
        </Link>
        <button type="button" aria-label="Leave the walkthrough" onClick={() => navigate(pathname)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:text-white">
          <X size={18} aria-hidden />
        </button>
      </span>
    </div>
  );
}
