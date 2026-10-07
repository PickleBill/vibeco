import { Loader2, RotateCcw } from "lucide-react";
import { cx, secondaryButton } from "../style";
import type { CallState } from "./useCommittee";
import type { WhatIf } from "./model";

/**
 * Hypotheticals from the brief, as toggles. "Re-run with these" runs the
 * meeting again assuming them; the result is shown against the saved meeting
 * and never kept.
 */
export function WhatIfPanel({
  options,
  checked,
  onToggle,
  onRun,
  onClear,
  call,
  active,
  ready,
}: {
  options: WhatIf[];
  checked: string[];
  onToggle: (id: string) => void;
  onRun: () => void;
  onClear: () => void;
  call: CallState;
  /** The what-ifs the meeting on screen assumed (empty: the saved meeting). */
  active: string[];
  /** A saved meeting exists to compare with. */
  ready: boolean;
}) {
  const loading = call.status === "loading";
  return (
    <fieldset className="min-w-0 rounded-xl border border-border bg-white px-4 pb-4 pt-2">
      <legend className="px-1.5 text-[15px] font-bold text-foreground">
        What if… <span className="font-normal text-muted-foreground">hypotheticals, not facts</span>
      </legend>
      <div className="flex flex-col gap-1">
        {options.map((o) => (
          <label key={o.id} htmlFor={`wi-${o.id}`} className={cx("flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-foreground", !ready && "cursor-not-allowed text-muted-foreground")}>
            <input
              id={`wi-${o.id}`}
              type="checkbox"
              checked={checked.includes(o.id)}
              disabled={!ready || loading}
              onChange={() => onToggle(o.id)}
              className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {o.label}
          </label>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRun} disabled={!ready || loading || !checked.length} className={secondaryButton}>
          {loading ? <Loader2 size={16} className="motion-safe:animate-spin" aria-hidden /> : <RotateCcw size={16} aria-hidden />}
          {loading ? "Re-running the meeting…" : "Re-run with these"}
        </button>
        {active.length > 0 && !loading && (
          <button type="button" onClick={onClear} className="min-h-11 text-[15px] font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Back to the saved meeting
          </button>
        )}
      </div>
      <p role="status" className="mt-2 text-sm text-[#4A4F63]">
        {!ready
          ? "Run the meeting first; what-ifs are compared with it."
          : loading
            ? "A fresh meeting takes 15 to 30 seconds."
            : call.status === "error"
              ? call.message
              : active.length
                ? `Showing the meeting if ${active.length === 1 ? "this were" : "these were"} true. Arrows compare it with the saved meeting. Not saved.`
                : "Pick up to three, then re-run. Nothing here is saved."}
      </p>
    </fieldset>
  );
}
