import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AccountRunner from "@/components/account/AccountRunner";
import { AccountSwitcher } from "../AccountSwitcher";
import { splitCompany } from "../model";
import { moduleHref } from "../nav";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import type { ModuleProps } from "./types";

/**
 * 02 · Run an account: the live account lens (research, plan, seven agents,
 * verdict), or a saved run by id. Once a run starts the intro folds into a
 * compact run bar, so the results start near the top. The URL follows the run
 * on screen (a saved run opened from the picker, a live run once it's saved),
 * so the rail carries it to the committee and the deal room.
 */
export function AccountModule({ seller, territory, reportId }: ModuleProps) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [open, setOpen] = useState<{ id: string; company: string } | null>(null);

  // Leaving a run for the bare URL (/for/omni/account) starts over with the empty form;
  // moving between runs doesn't remount (the runner opens the new id itself).
  const [fresh, setFresh] = useState(0);
  const prev = useRef(reportId);
  useEffect(() => {
    if (prev.current && !reportId) {
      setFresh((n) => n + 1);
      setOpen(null);
    }
    prev.current = reportId;
  }, [reportId]);

  const onRunChange = (run: { id: string; company: string } | null) => {
    setOpen(run);
    if (run && run.id !== reportId) navigate({ pathname: moduleHref(seller.id, "account", run.id), search }, { replace: true });
  };

  return (
    <div>
      <AccountRunner
        key={fresh}
        seller={seller}
        initialReportId={reportId}
        inShell
        onRunChange={onRunChange}
        picker={
          territory.rows.length > 0 ? (
            <AccountSwitcher
              label="Saved runs"
              rows={territory.rows}
              activeId={open?.id ?? reportId}
              hrefFor={(id) => moduleHref(seller.id, "account", id)}
              loading={territory.loading}
              segments={seller.territory?.segments}
            />
          ) : undefined
        }
        intro={
          <PageHeader eyebrow="Run an account · live" title={seller.headline}>
            {seller.intro}
          </PageHeader>
        }
      />
      <NextStep seller={seller.id} from="account" account={open ? { id: open.id, name: splitCompany(open.company).name } : undefined} />
    </div>
  );
}
