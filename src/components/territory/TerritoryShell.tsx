import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import type { SellerConfig } from "@/lib/sellers";
import { ranAt } from "@/components/account/explorer/savedRuns";
import type { CurrentAccount } from "./current";
import type { TerritoryState } from "./useTerritory";
import { MODULES, moduleHref, railHref, type ModuleId } from "./nav";
import { cx } from "./style";
import { FieldPill, LivePill } from "./ui";
import { HowItWorksButton, TourHost } from "./tour/TourHost";

/**
 * The presenter walkthrough: the same four steps as the tour, on the first
 * saved run (Relay) wherever a step needs an account. The Deal Room stays in
 * the rail but off this path.
 */
const DEMO_STEPS: { id: ModuleId; text: string; next: string; withAccount?: boolean }[] = [
  { id: "account", text: "Three whys, seven agents, a verdict", next: "Open the radar", withAccount: true },
  { id: "radar", text: "The territory at a glance", next: "Find lookalikes" },
  { id: "lookalikes", text: "More like this account", next: "Simulate its committee", withAccount: true },
  { id: "committee", text: "The buying room and the MEDDPICC gaps", next: "Run your own account", withAccount: true },
];

/**
 * The territory command center: a top bar, a rail of workbook tabs (left on
 * desktop, across the top on phones) and the current view. The rail carries
 * the current account into the one-account views. The seller's theme goes on
 * <html> while the page is open, so popovers and tooltips match.
 */
export function TerritoryShell({
  seller,
  module,
  territory,
  current,
  children,
}: {
  seller: SellerConfig;
  module: ModuleId;
  territory: TerritoryState;
  /** The account the rail carries (see current.ts). */
  current?: CurrentAccount;
  children: ReactNode;
}) {
  const theme = seller.theme;
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.classList.add(theme);
    return () => root.classList.remove(theme);
  }, [theme]);

  const accounts = seller.territory?.accounts ?? [];
  const total = accounts.length;
  // "Southeast · 1 Strategic · 12 Enterprise" when the territory is split by segment.
  const split = (seller.territory?.segments ?? []).map((s) => ({ ...s, count: accounts.filter((a) => a.segment === s.id).length }));
  const chip = split.length ? split.map((s) => `${s.count} ${s.label}`).join(" · ") : `${total} accounts`;
  const chipTitle = split.length ? `${total} accounts: ${split.map((s) => `${s.count} ${s.label} (${s.note})`).join(", ")}` : undefined;
  const latest = territory.rows.reduce<string | null>((a, r) => (!a || r.ranAt > a ? r.ranAt : a), null);
  const rail = useRailScroll(module);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center gap-x-3 gap-y-2.5 border-b border-border bg-background px-4 py-1.5 sm:flex-wrap sm:gap-x-5 sm:px-7 sm:py-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-md font-display text-[21px] font-bold tracking-[-0.01em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            VibeCo
          </Link>
          <span className="hidden truncate text-[15px] text-[#4A4F63] sm:inline">Territory Command Center</span>
          <HowItWorksButton />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Phones: "Omni · unofficial". */}
          <FieldPill className="h-8 text-sm">
            <span className="hidden sm:inline">Seller profile:</span> {seller.name}
            <span className="text-xs font-normal text-muted-foreground">
              <span className="sm:hidden">· </span>unofficial
            </span>
          </FieldPill>
          {seller.territory && (
            <span title={chipTitle} className="hidden sm:inline-flex">
              <FieldPill glyph="#" className="h-8 text-sm">
                {seller.territory.name} · {chip}
              </FieldPill>
            </span>
          )}
          {latest && <LivePill className="hidden xl:inline-flex">Latest run {ranAt(latest)}</LivePill>}
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row lg:items-stretch">
        <nav
          ref={rail.ref}
          onScroll={rail.onScroll}
          aria-label="Views"
          style={rail.mask}
          className="flex shrink-0 gap-0.5 overflow-x-auto overscroll-x-contain border-b border-border bg-muted px-2 pt-2 [scrollbar-width:none] sm:px-3 sm:pt-2.5 lg:w-[248px] lg:flex-col lg:gap-1 lg:overflow-visible lg:border-b-0 lg:border-r lg:py-6 lg:pl-3.5 lg:pr-0 [&::-webkit-scrollbar]:hidden"
        >
          {MODULES.map((m, i) => {
            const on = m.id === module;
            return (
              <Fragment key={m.id}>
                {/* Run an account stands alone; the rest explore. A label on desktop, a hairline on phones. */}
                {i === 1 && (
                  <>
                    <span aria-hidden className="mx-1.5 my-2.5 w-px shrink-0 self-stretch bg-[#D9D4C7] sm:mx-2 lg:hidden" />
                    <p className="hidden px-3.5 pb-1 pt-5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground lg:block">Explore</p>
                  </>
                )}
                <Link
                  to={railHref(seller.id, m.id, current)}
                  aria-current={on ? "page" : undefined}
                  className={cx(
                    "flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-3 sm:px-3.5 lg:min-h-[58px] lg:whitespace-normal lg:text-base",
                    "rounded-t-[10px] lg:rounded-l-[10px] lg:rounded-tr-none",
                    on
                      ? "-mb-px border border-border border-b-background bg-background font-bold shadow-[inset_0_3px_0_hsl(var(--primary))] lg:-mr-px lg:mb-0 lg:border-b-border lg:border-r-background lg:shadow-[inset_3px_0_0_hsl(var(--primary))]"
                      : "border border-transparent font-medium text-[#4A4F63] hover:text-foreground",
                  )}
                >
                  <span className="hidden font-mono text-xs font-medium text-muted-foreground sm:inline">{m.idx}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="lg:hidden">{m.short}</span>
                    <span className="hidden lg:inline">{m.label}</span>
                    <span className="hidden text-[13px] font-normal leading-snug text-muted-foreground lg:block">{m.hint}</span>
                  </span>
                </Link>
              </Fragment>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 pb-14 pt-6 sm:px-8 sm:pt-7">
          <div className="mx-auto max-w-[1240px]">
            <DemoBar seller={seller} module={module} demoReportId={seller.territory?.accounts[0]?.reportId} />
            {children}
          </div>
        </main>
      </div>

      <footer className="border-t border-border">
        <div className="flex flex-col gap-1.5 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p>
            {seller.footer} AI voices are synthetic.
          </p>
          <Link to="/" className="inline-flex min-h-11 items-center self-start rounded-md hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto">
            Made with VibeCo
          </Link>
        </div>
      </footer>
      <TourHost seller={seller} />
    </div>
  );
}

/**
 * The rail scrolls sideways on phones: keep the open view's tab in sight and
 * fade whichever edge has more tabs past it.
 */
function useRailScroll(module: ModuleId) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const more = el.scrollWidth - el.clientWidth;
    const next = { left: more > 1 && el.scrollLeft > 2, right: more > 1 && el.scrollLeft < more - 2 };
    setEdges((e) => (e.left === next.left && e.right === next.right ? e : next));
  };
  useEffect(() => {
    const el = ref.current;
    const tab = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && tab && el.scrollWidth > el.clientWidth) el.scrollLeft = tab.offsetLeft - (el.clientWidth - tab.offsetWidth) / 2;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [module]);
  const edge = (more: boolean) => (more ? "transparent" : "#000");
  const mask = edges.left || edges.right ? `linear-gradient(to right, ${edge(edges.left)}, #000 28px, #000 calc(100% - 40px), ${edge(edges.right)})` : undefined;
  return { ref, onScroll: measure, mask: mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined };
}

/**
 * Presenter walkthrough (?demo): a dark bar naming the step and a Next button
 * that carries the demo account (the first saved run) along the four steps.
 * The last Next leaves the walkthrough on the empty run form. A view off the
 * path (the Deal Room) offers the way back to step 1.
 */
function DemoBar({ seller, module, demoReportId }: { seller: SellerConfig; module: ModuleId; demoReportId?: string }) {
  const { search, pathname } = useLocation();
  const navigate = useNavigate();
  if (!new URLSearchParams(search).has("demo")) return null;
  const i = DEMO_STEPS.findIndex((s) => s.id === module);
  const stepHref = (s: (typeof DEMO_STEPS)[number]) => `${moduleHref(seller.id, s.id, s.withAccount ? demoReportId : undefined)}?demo`;
  const next = i < 0 ? DEMO_STEPS[0] : DEMO_STEPS[i + 1];
  const nextHref = next ? stepHref(next) : moduleHref(seller.id, "account");
  const nextLabel = i < 0 ? "Back to step 1" : DEMO_STEPS[i].next;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-foreground px-4 py-3 text-white">
      <span className="font-mono text-sm">{i < 0 ? "Demo · off the path" : `Demo · step ${i + 1} of ${DEMO_STEPS.length} · ${DEMO_STEPS[i].text}`}</span>
      <span className="flex items-center gap-2">
        <Link to={nextHref} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand bg-brand px-4 text-[15px] font-bold text-brand-foreground">
          {nextLabel} <ArrowRight size={16} aria-hidden />
        </Link>
        <button type="button" aria-label="Leave the walkthrough" onClick={() => navigate(pathname)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-white/80 hover:text-white">
          <X size={18} aria-hidden />
        </button>
      </span>
    </div>
  );
}
