// Small pieces the command-center views share, after the design's component
// sheet. Evidence colors are semantic and fixed (never the accent); the accent
// (bg-brand) marks live and "just finished" moments; pink that must be read is
// text-primary. Every cue has a shape as well as a color.
//
// Three kinds of marks, one rule each:
// - Tags describe (motion, fit, segment, evidence status, live/saved). Square
//   corners, no hover, never clickable: everything in this file but the tabs.
// - Sources are the small numbered chips; a number always opens a source.
// - Actions do something: buttons (style.ts), or fully rounded pills for
//   choices and quick picks (toggle in explorer/look.ts). Round means click.
import type { ReactNode } from "react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { ageDays } from "./model";
import { ageText, cx, freshness, type Freshness } from "./style";

// ─── Evidence tags ───

const TAG: Record<string, { label: string; cls: string }> = {
  Confirmed: { label: "Confirmed", cls: "bg-[#16703F] text-white border border-[#16703F]" },
  Inferred: { label: "Inferred", cls: "bg-[#FFF4E0] text-foreground border border-dashed border-[#B45309]" },
  Former: { label: "Former", cls: "bg-white text-[#5C6175] border border-[#9097A6] line-through" },
  "Not found": { label: "Not found", cls: "bg-transparent text-[#6B7080] border border-dotted border-[#9097A6]" },
  // Qualification and the three whys.
  Gap: { label: "Gap", cls: "bg-transparent text-[#6B7080] border border-dotted border-[#9097A6]" },
  Hypothesis: { label: "Hypothesis", cls: "bg-[#FFF4E0] text-foreground border border-dashed border-[#B45309]" },
  Verified: { label: "Verified", cls: "bg-[#16703F] text-white border border-[#16703F]" },
  Account: { label: "Confirmed by the account", cls: "bg-[#16703F] text-white border border-[#16703F] shadow-[inset_0_0_0_2px_#fff]" },
};

/** Confirmed solid, Inferred dashed amber, Former struck, Not found dotted. */
export function EvidenceTag({ status, className }: { status?: string; className?: string }) {
  const t = TAG[status ?? ""] ?? TAG.Inferred;
  return <span className={cx("inline-flex h-[26px] shrink-0 items-center rounded-[4px] px-2 text-xs font-semibold", t.cls, className)}>{t.label}</span>;
}

// ─── Source chips: numbered, with an age that fades ───

const CHIP_BOX: Record<Freshness, string> = {
  fresh: "border border-foreground",
  aging: "border border-[#9097A6]",
  stale: "border border-dashed border-[#9097A6]",
  undated: "border border-dotted border-[#9097A6]",
};

/** "[2 | 6d]": the source number and its age; links to the source. */
export function SourceChip({ source, n, now }: { source?: ResearchSource; n: number; now?: Date }) {
  const days = source?.date ? ageDays(source.date, now) : null;
  const tier = freshness(days);
  const body = (
    <span className={cx("inline-flex h-6 items-stretch overflow-hidden rounded-[5px] font-mono text-xs leading-[22px]", CHIP_BOX[tier])}>
      <span className={cx("px-1.5 font-semibold", tier === "fresh" ? "bg-foreground text-white" : "bg-white text-foreground")}>{n}</span>
      {/* Undated sources show the number alone; the dotted border marks them. */}
      {days != null && (
        <span className={cx("px-1.5", tier === "fresh" ? "font-semibold text-foreground" : tier === "aging" ? "font-medium text-[#4A4F63]" : "text-[#6B7080]")}>
          {ageText(days)}
        </span>
      )}
    </span>
  );
  const title = `[${n}] ${source?.title ?? "Source"}${source?.date ? ` · ${source.date}` : " · date not captured"}`;
  return source?.url ? (
    <a href={source.url} target="_blank" rel="noopener noreferrer" title={title} className="inline-flex rounded-[5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </a>
  ) : (
    <span title={title}>{body}</span>
  );
}

// ─── Account pill pieces ───

/**
 * A field-style tag: "Motion: Both". A glyph only where it carries meaning
 * ("✓ On the list", "# Southeast"); none by default.
 */
export function FieldPill({ children, glyph, className }: { children: ReactNode; glyph?: string; className?: string }) {
  return (
    <span className={cx("inline-flex h-[26px] items-center gap-1.5 rounded-[4px] border border-[#D9D4C7] bg-white px-2 text-[13px] font-medium text-foreground", className)}>
      {glyph && (
        <span aria-hidden className="font-mono text-xs text-muted-foreground">
          {glyph}
        </span>
      )}
      {children}
    </span>
  );
}

/** Fit A filled, B solid, C dashed: evidence and timing, not deal size. */
export function FitBadge({ grade, label = true }: { grade?: string; label?: boolean }) {
  const g = (grade ?? "").trim().toUpperCase().slice(0, 1);
  const box =
    g === "A" ? "bg-foreground text-white border-[1.5px] border-foreground" : g === "B" ? "bg-white text-foreground border-[1.5px] border-foreground" : "bg-white text-foreground border-[1.5px] border-dashed border-[#4A4F63]";
  const badge = <span className={cx("inline-flex h-5 w-5 items-center justify-center rounded font-mono text-[13px] font-semibold", box)}>{g || "?"}</span>;
  if (!label) return badge;
  return (
    <span title="Fit: evidence and timing, not deal size" className="inline-flex h-[26px] items-center gap-1.5 rounded-[4px] border border-[#D9D4C7] bg-white pl-2 pr-1 text-[13px] font-medium">
      Fit {badge}
    </span>
  );
}

/** Pink live pill: "● Run finished 06:02". */
export function LivePill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-8 items-center gap-2 rounded-[4px] border border-brand bg-brand-tint px-3 text-sm font-semibold text-foreground", className)}>
      <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden />
      {children}
    </span>
  );
}

/** Mono uppercase eyebrow over a section title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("font-mono text-[13px] font-medium uppercase tracking-[0.06em] text-muted-foreground", className)}>{children}</p>;
}

// ─── Buttons ───

// ─── Workbook tabs: the selected tab joins the sheet below it ───

export function WorkbookTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-border"
      onKeyDown={(e) => {
        // Arrow keys move between tabs, Home/End jump to the ends (WAI-ARIA tabs).
        const i = tabs.findIndex((t) => t.id === value);
        const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined || !tabs.length) return;
        e.preventDefault();
        const t = tabs[(next + tabs.length) % tabs.length];
        onChange(t.id);
        (e.currentTarget.querySelector(`[data-tab="${t.id}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            data-tab={t.id}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={cx(
              "-mb-px inline-flex min-h-[46px] shrink-0 items-center whitespace-nowrap rounded-t-lg px-4 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border border-border border-b-white bg-white font-bold text-foreground shadow-[inset_0_3px_0_hsl(var(--primary))]" : "border border-transparent font-medium text-[#4A4F63] hover:text-foreground",
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-2 font-mono text-xs text-muted-foreground">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** The sheet under a row of workbook tabs. */
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-b-xl border border-t-0 border-border bg-white p-4 sm:p-6", className)}>{children}</div>;
}
