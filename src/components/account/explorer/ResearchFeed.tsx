import { motion } from "framer-motion";
import { Briefcase, Newspaper } from "lucide-react";
import type { BriefResearch } from "@/components/simulator/SourcesList";
import { ATS_LABEL } from "@/lib/jobBoards";
import { cx } from "@/components/territory/style";
import { Eyebrow, LivePill } from "@/components/territory/ui";
import { card, label } from "./look";

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
      <section className={cx(card, "p-5 sm:p-6")} aria-label="Reading the sources">
        <LivePill>Reading the sources</LivePill>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-foreground">
          {company}&rsquo;s own job board, its product pages, the web for its data stack, and the last 12 months of news.
        </p>
        <div className="mt-4 space-y-2.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-3.5 rounded bg-muted" style={{ width: `${88 - i * 12}%` }} />
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
      <div className={cx(card, "p-4 sm:p-5")}>
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px] text-[#4A4F63]">
          <span className="font-semibold text-foreground">
            <span className="font-mono">{sources.length}</span> source{sources.length === 1 ? "" : "s"}
          </span>
          {scan?.found && scan.scanned_jobs > 0 && (
            <span>
              <span className="font-mono">{scan.scanned_jobs}</span> open role{scan.scanned_jobs === 1 ? "" : "s"} read on its {ATS_LABEL[scan.ats ?? ""] ?? ""} board
            </span>
          )}
          {researchMs !== undefined && <span className="font-mono text-sm">{secs(researchMs)}</span>}
          {(research.dropped ?? 0) > 0 && (
            <span>
              {research.dropped} result{research.dropped === 1 ? "" : "s"} never named {company}, so dropped
            </span>
          )}
        </p>

        {writingMs !== undefined && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <LivePill>Writing the first-call plan from these sources</LivePill>
              <span className="font-mono text-sm text-[#4A4F63]">
                {secs(writingMs)} <span className="hidden sm:inline">· usually ~{Math.round(typicalMs / 1000)}s</span>
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-[#E4E0D6]"
              role="progressbar"
              aria-label="Writing the plan"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-[#4A4F63]">Then code checks every stack claim against its source before anything is shown.</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {scan && (
          <div className={cx(card, "p-4 sm:p-5")}>
            <Eyebrow className="flex items-center gap-1.5">
              <Briefcase size={14} aria-hidden /> Its own job posts
            </Eyebrow>
            {!scan.found ? (
              <p className="mt-2 text-[15px] text-[#4A4F63]">No public Greenhouse, Lever or Ashby board found.</p>
            ) : tools.length || signals.length ? (
              <>
                {firm.length > 0 && (
                  <>
                    <p className={cx(label, "mt-3")}>Named plainly</p>
                    <ul className="mt-1.5 flex flex-wrap gap-2">
                      {firm.map((t, i) => (
                        <motion.li
                          key={t.tool}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.08 * i }}
                          className="inline-flex h-[30px] items-center gap-2 rounded-[6px] border border-foreground bg-card px-2.5 text-sm font-semibold text-foreground"
                        >
                          {t.tool} <span className="font-mono text-xs font-medium text-muted-foreground">{t.posts}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </>
                )}
                {options.length > 0 && (
                  <>
                    <p className={cx(label, "mt-3")}>Only as options, so not confirmed</p>
                    <ul className="mt-1.5 flex flex-wrap gap-2">
                      {options.map((t) => (
                        <li key={t.tool} className="inline-flex h-[30px] items-center rounded-[6px] border border-dashed border-[#9097A6] px-2.5 text-sm text-[#4A4F63]">
                          {t.tool}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {signals.length > 0 && (
                  <p className="mt-3 text-[15px] text-foreground">
                    <span className="font-semibold">Signal:</span> posts describe analytics shipped to its customers.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-[15px] text-[#4A4F63]">None of its {scan.scanned_jobs} open roles name a data tool.</p>
            )}
          </div>
        )}
        <div className={cx(card, "p-4 sm:p-5")}>
          <Eyebrow>Sources by kind</Eyebrow>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.entries(counts).map(([k, n]) => (
              <li key={k} className="inline-flex h-[30px] items-center gap-2 rounded-[6px] border border-[#D9D4C7] bg-card px-2.5 text-sm font-medium text-foreground">
                {k} <span className="font-mono text-xs text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
          {newest && (
            <p className="mt-3 flex gap-2 text-[15px] leading-snug text-foreground">
              <Newspaper size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">Newest:</span> {newest.title} <span className="font-mono text-sm text-[#4A4F63]">({newest.date})</span>
              </span>
            </p>
          )}
        </div>
      </div>

      <ol className={cx(card, "divide-y divide-border overflow-hidden")}>
        {sources.map((s, i) => (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.06 * i, duration: 0.25 }}
            className="flex items-baseline gap-3 px-4 py-2.5 text-[15px]"
          >
            <span className="w-6 shrink-0 text-right font-mono text-xs font-semibold text-muted-foreground">{s.id}</span>
            <span className="min-w-0 flex-1 truncate text-foreground">{s.title}</span>
            <span className="hidden shrink-0 font-mono text-xs text-muted-foreground sm:inline">{hostOf(s.url)}</span>
            <span className="shrink-0 rounded-[4px] border border-[#D9D4C7] bg-muted px-1.5 font-mono text-xs uppercase text-[#4A4F63]">
              {s.via ? "Own job post" : KIND[s.kind ?? ""] ?? "Web"}
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
