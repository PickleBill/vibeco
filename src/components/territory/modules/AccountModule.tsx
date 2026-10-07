import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import AccountRunner from "@/components/account/AccountRunner";
import { AccountSwitcher } from "../AccountSwitcher";
import { rememberRan } from "../current";
import { splitCompany } from "../model";
import { moduleHref } from "../nav";
import { NextStep } from "../NextStep";
import { PageHeader } from "../PageHeader";
import type { ModuleProps } from "./types";

/**
 * 01 · Run an account, the front door (/for/omni): always the empty form
 * first (a box, saved and live quick picks). A saved run opens from a pill,
 * the picker, a next-step link or a URL with its id; ?run=<company> starts a
 * live run of it once. Once a run starts the intro folds into a compact run
 * bar, so the results start near the top. The URL follows the run on screen
 * (a saved run opened, a live run once it's saved), so the rail carries it to
 * the committee and the deal room; a run from outside the territory is also
 * kept as "Just ran" for the pickers in lookalikes, the committee and the
 * deal room.
 */
export function AccountModule({ seller, territory, reportId }: ModuleProps) {
  const navigate = useNavigate();
  const { search, key } = useLocation();
  const navType = useNavigationType();
  const [open, setOpen] = useState<{ id: string; company: string } | null>(null);
  const asked = new URLSearchParams(search).get("run")?.trim();

  // The runner starts over (a new key) on the empty form, or on a live run of ?run=<company>.
  const [fresh, setFresh] = useState<{ n: number; run?: string }>({ n: 0 });
  const seen = useRef({ key, reportId });
  useEffect(() => {
    const before = seen.current;
    seen.current = { key, reportId };
    if (asked) {
      // Run it once, then drop the param; that replace isn't "leaving a run".
      const q = new URLSearchParams(search);
      q.delete("run");
      setFresh((f) => ({ n: f.n + 1, run: asked }));
      setOpen(null);
      seen.current = { key, reportId: undefined };
      navigate({ pathname: moduleHref(seller.id, "account"), search: q.toString() ? `?${q}` : "" }, { replace: true });
      return;
    }
    // Back at the bare URL from a run, or the Run tab clicked again: the empty form.
    if (before.key !== key && !reportId && (before.reportId || navType === "PUSH")) {
      setFresh((f) => ({ n: f.n + 1 }));
      setOpen(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per navigation
  }, [key]);

  const onRunChange = (run: { id: string; company: string } | null) => {
    setOpen(run);
    if (run && !seller.territory?.accounts.some((a) => a.reportId === run.id)) rememberRan(seller.id, { id: run.id, name: splitCompany(run.company).name });
    if (run && run.id !== reportId) navigate({ pathname: moduleHref(seller.id, "account", run.id), search }, { replace: true });
  };

  return (
    <div>
      <AccountRunner
        key={fresh.n}
        seller={seller}
        initialReportId={asked ? undefined : reportId}
        autoRun={fresh.run}
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
          <PageHeader eyebrow="Run an account" title={seller.headline}>
            {seller.intro}
          </PageHeader>
        }
      />
      <NextStep seller={seller.id} from="account" account={open ? { id: open.id, name: splitCompany(open.company).name } : undefined} />
    </div>
  );
}
