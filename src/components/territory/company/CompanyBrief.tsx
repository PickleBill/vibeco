import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { label, linkBtn, primaryBtn, secondaryBtn } from "@/components/account/explorer/look";
import { OMNI_TEXT, type TerritoryRow } from "../model";
import { moduleHref } from "../nav";
import { SegmentTag } from "../radar/segments";
import { cx } from "../style";
import { FieldPill, FitBadge } from "../ui";
import { CompanyLogo } from "./CompanyLogo";
import { briefFacts } from "./model";

const OMNI_GLYPH = { Confirmed: "✓", Likely: "◌", "None found": "○" } as const;

/**
 * A light brief on one account, over whatever view opened it: who it is, the
 * tags, its one line, why now, the confirmed stack, and where to go next.
 * Everything comes from the account's saved run. Render it inside a Dialog
 * root (CompanyName does); `onNavigate` closes it when an action is taken.
 */
export function CompanyBrief({ row, seller, onNavigate }: { row: TerritoryRow; seller: string; onNavigate?: () => void }) {
  const facts = briefFacts(row);
  // No account line, no description: say so, as Radix asks.
  const describe = facts.line ? {} : { "aria-describedby": undefined };
  return (
    <DialogPortal>
      <DialogOverlay className="bg-[#1A1D2E]/45 motion-reduce:!animate-none" />
      <DialogPrimitive.Content
        {...describe}
        className={cx(
          "fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto overscroll-contain rounded-xl border border-foreground bg-card text-foreground shadow-[0_18px_48px_-12px_rgba(26,29,46,0.35)] focus:outline-none",
          // Slide from -50% so the card stays centered while it scales in and out.
          "duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-1/2",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 motion-reduce:!animate-none",
        )}
      >
        <div className="flex items-start gap-3 border-b border-border bg-muted px-4 py-4 sm:px-5">
          <CompanyLogo domain={row.domain} name={row.name} size={40} />
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-display text-2xl font-bold leading-tight tracking-[-0.01em]">{row.name}</DialogTitle>
            {row.domain && (
              <a
                href={`https://${row.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 rounded-[4px] font-mono text-[13px] text-[#4A4F63] underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {row.domain}
                <ArrowUpRight size={13} aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
          <DialogClose className="-mr-2 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-foreground transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <X size={20} aria-hidden />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
          <ul aria-label="Tags" className="flex flex-wrap items-center gap-1.5">
            {row.segment && (
              <li>
                <SegmentTag segment={row.segment} />
              </li>
            )}
            <li>
              <FieldPill>Motion: {row.motion}</FieldPill>
            </li>
            {row.fit && (
              <li>
                <FitBadge grade={row.fit} />
              </li>
            )}
            <li>
              <FieldPill glyph={OMNI_GLYPH[row.omni]}>{OMNI_TEXT[row.omni].full}</FieldPill>
            </li>
          </ul>

          {facts.line && (
            <DialogDescription className="text-base leading-relaxed text-foreground">
              {facts.line}
            </DialogDescription>
          )}

          <div>
            <p className={label}>Why now</p>
            {facts.why ? (
              <p className="mt-1 line-clamp-4 text-[15px] leading-relaxed">
                <span className="mr-1.5 font-mono text-[13px] font-semibold">{facts.why.month}</span>
                {facts.why.text}
              </p>
            ) : (
              <p className="mt-1 text-[15px] text-[#4A4F63]">No dated trigger found</p>
            )}
          </div>

          {facts.stack.length > 0 && (
            <div>
              <p className={label}>Confirmed stack</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {facts.stack.map((s) => (
                  <li key={`${s.category}-${s.tool}`}>
                    <FieldPill glyph={s.category}>{s.tool}</FieldPill>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {facts.sources ? `From ${facts.sources} source${facts.sources === 1 ? "" : "s"}` : "No sources captured"}
            {facts.day && ` · saved run of ${facts.day}`}
          </p>

          <div className="flex flex-col gap-1 border-t border-border pt-4">
            <div className="flex flex-wrap gap-2">
              <Link to={moduleHref(seller, "account", row.id)} onClick={onNavigate} className={cx(primaryBtn, "text-[15px]")}>
                Open the run <ArrowRight size={16} aria-hidden />
              </Link>
              <Link to={moduleHref(seller, "committee", row.id)} onClick={onNavigate} className={cx(secondaryBtn, "text-[15px]")}>
                Simulate its committee <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
            <Link to={moduleHref(seller, "lookalikes", row.id)} onClick={onNavigate} className={cx(linkBtn, "self-start")}>
              Find lookalikes <ArrowRight size={15} aria-hidden />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">Unofficial. Built from public sources.</p>
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
