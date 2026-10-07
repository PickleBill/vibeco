import { useEffect, useMemo, useState } from "react";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { getSeller } from "@/lib/sellers";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import { splitCompany } from "@/components/territory/model";
import { buildClaims } from "@/components/territory/dealroom/claims";
import { useProspectAnswers } from "@/components/territory/dealroom/hooks";
import { ProspectBrief } from "@/components/territory/dealroom/ProspectBrief";

const PUBLIC = "Unofficial. Built from public sources.";

/**
 * /deal/:id: the prospect-facing brief ("here's what we think we know about
 * you, from public sources; correct us"). Claims and sources only: never the
 * fit grade, critics, objections, the plan or anything else internal. Public,
 * unlisted and noindex; no rail, no tracking, no email capture.
 */
const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SavedReport | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    setReport(undefined);
    if (!id) {
      setReport(null);
      return;
    }
    loadReport(id).then((r) => {
      if (live) setReport(r);
    });
    return () => {
      live = false;
    };
  }, [id]);

  const brief = report?.brief;
  const account = brief?.lens === "account" ? brief : undefined;
  const seller = getSeller(account?.seller);
  const company = account ? splitCompany(report?.idea || account.company || "") : { name: "" };

  // The seller's theme on <html> while the page is open (portals too).
  const theme = seller?.theme;
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.classList.add(theme);
    return () => root.classList.remove(theme);
  }, [theme]);

  return (
    <HelmetProvider>
      <Helmet>
        <title>{account ? `What we know about ${company.name} | VibeCo` : "Correct the brief | VibeCo"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <main className="min-h-screen bg-background text-foreground">
        {report === undefined ? (
          <Waiting />
        ) : account && report && id ? (
          <Brief key={id} reportId={id} report={report} company={company} disclaimer={seller?.footer ?? PUBLIC} />
        ) : (
          <Unavailable />
        )}
      </main>
    </HelmetProvider>
  );
};

function Brief({ reportId, report, company, disclaimer }: { reportId: string; report: SavedReport; company: { name: string; domain?: string }; disclaimer: string }) {
  const claims = useMemo(() => buildClaims(report.brief), [report]);
  const { responses, saveState, answer } = useProspectAnswers(reportId);
  return (
    <ProspectBrief
      company={company.name || "your company"}
      domain={company.domain}
      claims={claims}
      sources={Array.isArray(report.brief.research?.sources) ? report.brief.research!.sources : []}
      responses={responses}
      saveState={saveState}
      onAnswer={answer}
      disclaimer={disclaimer}
    />
  );
}

function Waiting() {
  return (
    <div aria-busy="true">
      <p className="border-b border-border bg-muted px-4 py-2.5 text-center text-sm font-semibold">{PUBLIC}</p>
      <div className="mx-auto max-w-[780px] px-3 pt-3.5 sm:px-6 sm:pt-5">
        <span className="px-1 font-display text-lg font-bold">VibeCo</span>
        <div className="mt-3 rounded-2xl border border-border bg-white px-4 py-6 sm:px-8 sm:py-8">
          <p className="text-[15px] text-[#4A4F63]">Loading the brief…</p>
          <div className="mt-4 flex flex-col gap-3" aria-hidden>
            <span className="h-7 w-4/5 rounded bg-muted" />
            <span className="h-4 w-full rounded bg-muted" />
            <span className="h-4 w-3/5 rounded bg-muted" />
            <span className="mt-3 h-28 w-full rounded-xl bg-muted" />
            <span className="h-28 w-full rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A missing run, or one that isn't an account brief. */
function Unavailable() {
  return (
    <div>
      <p className="border-b border-border bg-muted px-4 py-2.5 text-center text-sm font-semibold">{PUBLIC}</p>
      <div className="mx-auto max-w-[620px] px-3 pt-3.5 sm:px-6 sm:pt-5">
        <span className="px-1 font-display text-lg font-bold">VibeCo</span>
        <section aria-labelledby="gone-title" className="mt-3 rounded-2xl border border-border bg-white px-5 py-7 sm:px-8">
          <h1 id="gone-title" className="font-display text-2xl font-semibold">
            This brief isn't available
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#4A4F63]">The link may be incomplete, or the brief it points to was never shared as one you can correct.</p>
          <p className="mt-2 text-base leading-relaxed text-[#4A4F63]">If you were expecting it, ask the person who sent it for a fresh link.</p>
        </section>
      </div>
    </div>
  );
}

export default DealRoom;
