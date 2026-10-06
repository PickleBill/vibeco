import { ExternalLink, Globe, AlertTriangle } from "lucide-react";
import { ATS_LABEL } from "@/lib/jobBoards";

export interface ResearchSource {
  id: number;
  title: string;
  url: string;
  snippet: string;
  /** Account research lane that found it. */
  kind?: "stack" | "jobs" | "news" | string;
  /** Publish date, when the search result gave one (news). */
  date?: string;
  /** Judged not to be about the company (e.g. a different business with the same name); never cited. */
  off_topic?: boolean;
  /** The company's own job post, read from its public job board. */
  via?: "greenhouse" | "lever" | "ashby" | string;
}

/** What the job-board scan found (account research). */
export interface JobBoardScan {
  found: boolean;
  ats?: "greenhouse" | "lever" | "ashby" | string;
  board_url?: string;
  company_name?: string;
  total_jobs: number;
  scanned_jobs: number;
  tools: { tool: string; category: string; posts: number; firm: number }[];
  ms: number;
}

const KIND_LABEL: Record<string, string> = { stack: "Stack", jobs: "Hiring", news: "News" };

export interface BriefResearch {
  provider: "firecrawl" | "perplexity" | "jobboards" | "none" | string;
  query?: string;
  fetched_at?: string;
  sources: ResearchSource[];
  scan?: JobBoardScan;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Older runs stored snippets with markdown syntax; show plain text. */
function plain(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dateOf(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Search dates are ISO, "Mar 2, 2026" or "3 weeks ago": format the first two, keep the last as written. */
function shownDate(raw?: string): string {
  if (!raw) return "";
  return dateOf(raw) || (raw.length <= 24 ? raw : "");
}

/**
 * The live web sources behind a company or account brief, numbered to match
 * the [n] citations in the text. Renders an honest notice when none were found.
 * `compact` hides snippets (narrow columns, phones).
 */
const SourcesList = ({
  research,
  className = "",
  compact = false,
}: {
  research?: BriefResearch | null;
  className?: string;
  compact?: boolean;
}) => {
  if (!research) return null;
  const sources = Array.isArray(research.sources) ? research.sources : [];

  if (!sources.length) {
    return (
      <div className={`flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 ${className}`}>
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">No live sources for this run.</span> This read is based on the
          AI&rsquo;s general knowledge, which can be out of date. Check the facts before you rely on them.
        </p>
      </div>
    );
  }

  const fetched = dateOf(research.fetched_at);
  return (
    <section id="fr-sources" className={`scroll-mt-24 rounded-lg border border-border bg-card/40 p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          <Globe size={13} aria-hidden />
          {sources.length} live source{sources.length === 1 ? "" : "s"}
        </p>
        {fetched && <p className="text-[11px] text-muted-foreground">Searched the web on {fetched}</p>}
      </div>
      <ol className="space-y-2.5">
        {sources.map((s) => (
          <li key={s.id} className={`flex gap-3 text-sm ${s.off_topic ? "opacity-60" : ""}`}>
            <span className="w-6 shrink-0 text-right font-mono text-xs text-muted-foreground">[{s.id}]</span>
            <div className="min-w-0">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
              >
                <span className="break-words">{plain(s.title) || hostOf(s.url)}</span>
                <ExternalLink size={11} className="shrink-0" aria-hidden />
              </a>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>{hostOf(s.url)}</span>
                {s.via && ATS_LABEL[s.via] ? (
                  <span className="rounded border border-primary/30 bg-accent px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-primary">
                    Own job post · {ATS_LABEL[s.via]}
                  </span>
                ) : s.kind && KIND_LABEL[s.kind] && (
                  <span className="rounded border border-border bg-muted/60 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide">
                    {KIND_LABEL[s.kind]}
                  </span>
                )}
                {shownDate(s.date) && <span>{shownDate(s.date)}</span>}
                {s.off_topic && (
                  <span className="rounded border border-warning/40 bg-warning/10 px-1.5 py-px text-[10px] font-medium text-foreground">
                    Not about this company · not used
                  </span>
                )}
              </p>
              {s.snippet && !compact && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">{plain(s.snippet)}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Numbers match the [n] citations above. Sources are live web results, so open them before you quote them.
      </p>
    </section>
  );
};

export default SourcesList;
