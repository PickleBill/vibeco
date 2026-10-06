import { motion } from "framer-motion";
import { Briefcase, FileSearch, Loader2, Newspaper } from "lucide-react";
import type { BriefResearch } from "@/components/simulator/SourcesList";
import { ATS_LABEL } from "@/lib/jobBoards";

const KIND: Record<string, string> = { stack: "Stack", jobs: "Hiring", news: "News", product: "Product" };

const secs = (ms?: number) => (typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : "");

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Search dates are ISO or "6 days ago": newest-first ordering only needs a rough key. */
function dateKey(d?: string): number {
  if (!d) return 0;
  const t = Date.parse(d);
  if (!Number.isNaN(t)) return t;
  const m = /(\d+)\s+(hour|day|week|month|year)s?\s+ago/i.exec(d);
  if (!m) return 0;
  const unit = { hour: 3.6e6, day: 8.64e7, week: 6.048e8, month: 2.6e9, year: 3.15e10 }[m[2].toLowerCase() as "day"];
  return Date.now() - Number(m[1]) * unit;
}

/**
 * What the research found, while the plan is being written: a receipt (sources,
 * roles read, time), what its own job posts name, the sources as they land, the
 * newest dated headline, and a clock for the plan.
 */
export function ResearchFeed({
  research,
  company,
  researchMs,
  writingMs,
  typicalMs,
}: {
  research: BriefResearch | null;
  company: string;
  /** How long the sources took. */
  researchMs?: number;
  /** How long the plan has been writing (undefined until sources land). */
  writingMs?: number;
  typicalMs: number;
}) {
  if (!research) {
    return (
      <section className="rounded-xl border border-border bg-card p-5" aria-label="Reading the sources">
        <p className="flex items-center gap-2 text-[15px] text-foreground">
          <Loader2 size={16} className="animate-spin text-primary" aria-hidden />
          Reading {company}&rsquo;s own job board, product pages, the web for its data stack, and the last 12 months of news…
        </p>
        <div className="mt-4 space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-muted" style={{ width: `${88 - i * 12}%` }} />
          ))}
        </div>
      </section>
    );
  }
  const sources = Array.isArray(research.sources) ? research.sources : [];
  const scan = research.scan;
  const signals = (scan?.tools ?? []).filter((t) => t.signal || t.tool === "Customer-facing analytics");
  const tools = (scan?.tools ?? []).filter((t) => !signals.includes(t));
  const firm = tools.filter((t) => t.firm > 0);
  const options = tools.filter((t) => t.firm === 0);
  const counts = sources.reduce<Record<string, number>>((m, s) => {
    const k = s.via ? "Own job posts" : KIND[s.kind ?? ""] ?? "Web";
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  const newest = sources.filter((s) => s.kind === "news" && s.date).sort((a, b) => dateKey(b.date) - dateKey(a.date))[0];
  const pct = writingMs === undefined ? 0 : Math.min(97, 100 * (1 - Math.exp((-2.3 * writingMs) / typicalMs)));

  return (
    <section className="space-y-4" aria-label="What the research found">
      <div className="rounded-xl border border-primary/25 bg-card p-4 sm:p-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <FileSearch size={15} className="text-primary" aria-hidden />
            {sources.length} source{sources.length === 1 ? "" : "s"}
          </span>
          {scan?.found && scan.scanned_jobs > 0 && (
            <span>
              {scan.scanned_jobs} open role{scan.scanned_jobs === 1 ? "" : "s"} read on its {ATS_LABEL[scan.ats ?? ""] ?? ""} board
            </span>
          )}
          {researchMs !== undefined && <span className="tabular-nums">{secs(researchMs)}</span>}
          {(research.dropped ?? 0) > 0 && (
            <span>
              {research.dropped} result{research.dropped === 1 ? "" : "s"} never named {company}, so dropped
            </span>
          )}
        </p>

        {writingMs !== undefined && (
          <div className="mt-4">
            <p className="flex items-center justify-between gap-2 text-[15px] text-foreground">
              <span className="flex items-center gap-2">
                <Loader2 size={15} className="animate-spin text-primary" aria-hidden />
                Writing the first-call plan from these sources
              </span>
              <span className="tabular-nums text-sm text-muted-foreground">
                {secs(writingMs)} <span className="hidden sm:inline">· usually ~{Math.round(typicalMs / 1000)}s</span>
              </span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Writing the plan" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Then code checks every stack claim against its source before anything is shown.
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scan && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Briefcase size={13} aria-hidden /> Its own job posts
            </p>
            {!scan.found ? (
              <p className="mt-2 text-sm text-muted-foreground">No public Greenhouse, Lever or Ashby board found.</p>
            ) : tools.length || signals.length ? (
              <>
                {firm.length > 0 && (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">Named plainly</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {firm.map((t, i) => (
                        <motion.li
                          key={t.tool}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.08 * i }}
                          className="rounded-md border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-900"
                        >
                          {t.tool} <span className="tabular-nums text-emerald-700/80">{t.posts}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </>
                )}
                {options.length > 0 && (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">Only as options, so not confirmed</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {options.map((t) => (
                        <li key={t.tool} className="rounded-md border border-dashed border-amber-500/60 bg-amber-50/50 px-2 py-0.5 text-sm text-amber-900">
                          {t.tool}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {signals.length > 0 && (
                  <p className="mt-2 text-sm text-foreground/85">
                    <span className="font-semibold text-primary">Signal:</span> posts describe analytics shipped to its customers.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">None of its {scan.scanned_jobs} open roles name a data tool.</p>
            )}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Sources by kind</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(counts).map(([k, n]) => (
              <li key={k} className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-sm text-foreground">
                {k} <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
          {newest && (
            <p className="mt-3 flex gap-2 text-sm leading-snug text-foreground">
              <Newspaper size={15} className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>
                <span className="font-semibold">Newest:</span> {newest.title}{" "}
                <span className="text-muted-foreground">({newest.date})</span>
              </span>
            </p>
          )}
        </div>
      </div>

      <ol className="space-y-1.5">
        {sources.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.25 }}
            className="flex items-baseline gap-2 rounded-md border border-border/70 bg-card/60 px-3 py-2 text-sm"
          >
            <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">[{s.id}]</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{s.title}</span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{hostOf(s.url)}</span>
            <span className="shrink-0 rounded border border-border bg-muted/60 px-1.5 py-px text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {s.via ? "Own job post" : KIND[s.kind ?? ""] ?? "Web"}
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
