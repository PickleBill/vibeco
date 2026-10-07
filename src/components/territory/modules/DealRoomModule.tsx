import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import { AccountSwitcher } from "../AccountSwitcher";
import { splitCompany } from "../model";
import { moduleHref } from "../nav";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import { buildClaims, claimQuestions, planDiff, tally } from "../dealroom/claims";
import { useDealRoom } from "../dealroom/hooks";
import { ProspectBrief } from "../dealroom/ProspectBrief";
import { BoundaryCard, DiscoveryNotes, PhoneFrame, PlanDiffCard, QuestionsCard, SellerControl, SharePanel, type DealView } from "../dealroom/SellerCards";
import type { ModuleProps } from "./types";

/**
 * 05 · Deal Room (off the demo path): a brief the account can correct. The seller shares one link
 * (/deal/<id>); the account marks each public claim right, fixes it or skips
 * it; the answers come back here as discovery notes and a before/after of the
 * plan. A toggle shows exactly what the prospect sees, read-only.
 */
export function DealRoomModule({ seller, territory, reportId, current, justRan }: ModuleProps) {
  const activeId = reportId ?? current ?? territory.rows[0]?.id;
  const [report, setReport] = useState<SavedReport | null | undefined>(undefined);
  const [params, setParams] = useSearchParams();
  const view: DealView = params.get("view") === "seller" ? "seller" : "prospect";
  const setView = (v: DealView) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (v === "seller") next.set("view", "seller");
        else next.delete("view");
        return next;
      },
      { replace: true },
    );

  useEffect(() => {
    let live = true;
    setReport(undefined);
    if (activeId) loadReport(activeId).then((r) => live && setReport(r));
    return () => {
      live = false;
    };
  }, [activeId]);

  const brief = report?.brief?.lens === "account" ? report.brief : undefined;
  const claims = useMemo(() => buildClaims(brief), [brief]);
  const { room, reachable } = useDealRoom(brief ? activeId : undefined, report?.auto_analysis ? (report.auto_analysis as Record<string, unknown>).deal_room : undefined);
  const responses = useMemo(() => room?.responses ?? {}, [room]);
  const row = territory.rows.find((r) => r.id === activeId);
  const name = row?.name ?? (report ? splitCompany(report.idea || brief?.company || "").name : "");
  const domain = row?.domain ?? (report ? splitCompany(report.idea || "").domain : undefined);
  const url = activeId ? `${window.location.origin}/deal/${activeId}` : "";
  const sources = Array.isArray(brief?.research?.sources) ? brief!.research!.sources : [];
  const t = tally(claims, responses);

  return (
    <div>
      <PageHeader eyebrow="Deal Room · one shareable link" title={name ? `A brief ${name} can correct` : "A brief the account can correct"}>
        Share one link. The account sees only the public claims and their sources, marks each one right, fixes it or skips it, and the answers land here as discovery notes.
      </PageHeader>
      <div className="mt-4">
        <AccountSwitcher
          rows={territory.rows}
          activeId={activeId}
          hrefFor={(id) => moduleHref(seller.id, "deal", id)}
          loading={territory.loading}
          segments={seller.territory?.segments}
          justRan={justRan}
        />
      </div>

      {!activeId ? (
        <Empty>
          {territory.loading ? (
            "Loading the territory…"
          ) : (
            <>
              No saved runs in this territory yet.{" "}
              <Link to={moduleHref(seller.id, "account")} className="font-semibold text-primary underline-offset-2 hover:underline">
                Run an account
              </Link>{" "}
              first.
            </>
          )}
        </Empty>
      ) : report === undefined ? (
        <Empty>Loading the brief…</Empty>
      ) : !brief || !report ? (
        <Empty>{report ? "Deal Rooms work on account runs only. This run is a different kind of question." : "This run couldn't be read. Pick another account above."}</Empty>
      ) : (
        <>
          <div data-tour="deal-view" className="mt-6 flex flex-col gap-3">
            <SellerControl company={name} view={view} onView={setView} />
            <SharePanel company={name} url={url} />
          </div>

          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-mono text-[15px]" aria-live="polite">
              <b>{t.answered}</b> of {t.total} answered · {t.fix} correction{t.fix === 1 ? "" : "s"}
            </p>
            <p className="text-[15px] text-muted-foreground">
              {reachable === false
                ? "Answer sync isn't reachable right now, so answers made on the account's device stay there."
                : room?.updated_at
                  ? `Last answer ${new Date(room.updated_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · checks every 5 seconds`
                  : "Checks for answers every 5 seconds while this is open"}
            </p>
          </div>

          {view === "prospect" ? (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[404px_minmax(0,1fr)] lg:items-start">
              <div>
                <p className="mb-2.5 text-center font-mono text-[13px] text-muted-foreground">What {name} sees · read-only preview</p>
                <PhoneFrame label={`Preview of the page ${name} sees`}>
                  <ProspectBrief company={name} domain={domain} claims={claims} sources={sources} responses={responses} disclaimer={seller.footer} compact />
                </PhoneFrame>
              </div>
              <div className="flex flex-col gap-4">
                <BoundaryCard report={report} />
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start">
              <div>
                {t.answered === 0 && (
                  <p className="mb-3 rounded-xl border border-dotted border-[#9097A6] bg-white px-4 py-3 text-[15px] text-[#4A4F63]">
                    No answers yet. Notes appear here as {name} checks claims.
                  </p>
                )}
                <DiscoveryNotes claims={claims} sources={sources} responses={responses} />
              </div>
              <div className="flex flex-col gap-4">
                <PlanDiffCard rows={planDiff(claims, responses)} company={name} />
                <QuestionsCard {...claimQuestions(claims, responses)} />
                <BoundaryCard report={report} />
              </div>
            </div>
          )}
        </>
      )}

      <NextStep seller={seller.id} from="deal" account={brief && activeId ? { id: activeId, name } : undefined} />
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-6 rounded-xl border border-dotted border-[#9097A6] bg-white px-5 py-6 text-[15px] text-[#4A4F63]">{children}</p>;
}
