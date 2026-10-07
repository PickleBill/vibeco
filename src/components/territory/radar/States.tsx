import { Link } from "react-router-dom";
import { moduleHref } from "../nav";
import { cx, primaryButton } from "../style";

/** Loading the territory's saved runs: a progress count and skeleton lines. */
export function RadarLoading({ loaded, total }: { loaded: number; total: number }) {
  const pct = total ? Math.round((loaded / total) * 100) : 0;
  return (
    <div aria-busy="true" className="grid gap-7 rounded-xl border border-border bg-white p-5 sm:p-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div aria-hidden className="mx-auto aspect-square w-full max-w-[360px] animate-pulse rounded-full border border-border bg-background motion-reduce:animate-none" />
      <div className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold">Reading the territory&rsquo;s saved runs</h2>
          <span className="font-mono text-[15px] font-semibold">
            {loaded} / {total}
          </span>
        </div>
        <div role="progressbar" aria-label="Saved runs read" aria-valuemin={0} aria-valuemax={total} aria-valuenow={loaded} className="h-2.5 overflow-hidden rounded-full bg-border">
          <span className="block h-2.5 bg-foreground transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <div aria-hidden className="mt-1 flex flex-col gap-2">
          {[70, 90, 55, 80].map((w) => (
            <span key={w} className="block h-3.5 rounded bg-muted" style={{ width: `${w}%` }} />
          ))}
        </div>
        <p className="text-sm text-[#4A4F63]">Cards appear as each account&rsquo;s run is read. Nothing is re-run; these are finished runs.</p>
      </div>
    </div>
  );
}

/** Some saved runs couldn't be read: say which, and that the rest are shown. */
export function MissingNote({ missing, shown, className }: { missing: string[]; shown: number; className?: string }) {
  if (!missing.length) return null;
  const n = missing.length;
  return (
    <div role="alert" className={cx("rounded-[10px] border-2 border-foreground bg-background px-4 py-3.5", className)}>
      <p className="text-[17px] font-bold">
        {n} saved run{n > 1 ? "s" : ""} couldn&rsquo;t be read
      </p>
      <p className="mt-1 text-[15px] text-[#4A4F63]">
        {missing.map((m) => m.replace(/\s*\([^)]*\)\s*$/, "")).join(", ")} {n > 1 ? "are" : "is"} left off the radar. The other {shown} {shown === 1 ? "account is" : "accounts are"} current as of
        their last run. Reload to try again.
      </p>
    </div>
  );
}

/** No saved runs in the territory yet. */
export function RadarEmpty({ seller }: { seller: string }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-xl border border-border bg-white px-6 py-10 text-center">
      <svg viewBox="0 0 180 180" aria-hidden className="h-[180px] w-[180px]">
        <circle cx="90" cy="90" r="86" fill="#FAF8F2" stroke="#E4E0D6" />
        <circle cx="90" cy="90" r="58" fill="none" stroke="#E4E0D6" />
        <circle cx="90" cy="90" r="30" fill="none" stroke="#E4E0D6" />
        <circle cx="90" cy="90" r="3" fill="#1A1D2E" />
      </svg>
      <h2 className="font-display text-2xl font-semibold">No accounts on the radar yet</h2>
      <p className="max-w-md text-base text-[#4A4F63]">Run an account and it lands here: its freshest trigger, its motion and the one question to ask.</p>
      <Link to={moduleHref(seller, "account")} className={primaryButton}>
        Run an account
      </Link>
    </div>
  );
}
