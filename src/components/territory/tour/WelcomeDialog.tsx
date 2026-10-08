import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Handshake, Orbit, Play, Radar, Users, X, type LucideIcon } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { cx, primaryButton, secondaryButton } from "../style";
import { Eyebrow } from "../ui";

const Dot = () => <span aria-hidden className="mx-0.5 inline-block h-2.5 w-2.5 rounded-full bg-brand align-[0.05em]" />;

/** The five views in rail order, one short line each. */
const ROWS: { icon: LucideIcon; name: string; line: ReactNode }[] = [
  { icon: Play, name: "Run an account", line: "Any company: three whys, seven agents and a verdict in a minute." },
  { icon: Radar, name: "Radar", line: <>The territory at a glance. <span className="whitespace-nowrap"><Dot /> Pink = fresh trigger.</span></> },
  { icon: Orbit, name: "Lookalikes", line: "Accounts that look like your customers." },
  { icon: Users, name: "Committee", line: "Simulate the buying room, take a seat, see the MEDDPICC gaps." },
  { icon: Handshake, name: "Deal Room", line: "A brief the prospect can correct." },
];

/**
 * "How this works": what the command center is, the five views in a line
 * each, and the way in (the two-minute demo or your own clicks). Built on the
 * shadcn Dialog, with a lighter scrim and a full-size close button.
 */
export function WelcomeDialog({ open, sellerName, onClose, onTour }: { open: boolean; sellerName: string; onClose: () => void; onTour: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-[#1A1D2E]/45" />
        <DialogPrimitive.Content
          className={cx(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-white text-foreground shadow-[0_24px_60px_-20px_rgba(26,29,46,0.45)] focus-visible:outline-none",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] motion-reduce:animate-none",
          )}
        >
          <div className="px-5 pb-4 pt-5 sm:px-7">
            <Eyebrow>How this works</Eyebrow>
            <DialogTitle className="mt-2 pr-10 font-display [text-wrap:balance] text-[1.6rem] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[1.75rem]">
              A territory command center for {/^[aeiou]/i.test(sellerName) ? "an" : "a"} {sellerName} seller
            </DialogTitle>
            <DialogDescription className="mt-2.5 text-[15px] leading-relaxed text-[#4A4F63] sm:text-base">
              Built from public sources: every claim links to its source, and the AI voices are synthetic.
            </DialogDescription>
          </div>

          <ul className="mx-5 divide-y divide-border border-y border-border sm:mx-7">
            {ROWS.map(({ icon: Icon, name, line }) => (
              <li key={name} className="flex items-center gap-3.5 py-2.5">
                <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <p className="min-w-0 flex-1 text-[15px] leading-snug">
                  <b className="font-bold">{name}</b>
                  <span className="text-[#4A4F63]"> · {line}</span>
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 px-5 pb-5 pt-4 sm:px-7">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={onTour} className={cx(primaryButton, "min-h-12 text-base")}>
                <Play size={16} aria-hidden /> Demo in 2 minutes
              </button>
              <DialogClose className={cx(secondaryButton, "min-h-12 text-base")}>Explore on my own</DialogClose>
            </div>
          </div>

          <DialogClose
            aria-label="Close"
            className="absolute right-2.5 top-2.5 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#4A4F63] hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} aria-hidden />
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
