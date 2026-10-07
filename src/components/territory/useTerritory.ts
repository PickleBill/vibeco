import { useEffect, useMemo, useState } from "react";
import { loadReport } from "@/components/account/explorer/savedRuns";
import type { TerritoryAccount } from "@/lib/sellers";
import { toRow, type TerritoryRow } from "./model";

export interface TerritoryState {
  rows: TerritoryRow[];
  /** Still loading at least one run. */
  loading: boolean;
  /** Accounts whose saved run couldn't be read. */
  missing: string[];
}

/** Every saved run in the territory, read through the shared-report RPC (cached per page). */
export function useTerritory(accounts: TerritoryAccount[] | undefined): TerritoryState {
  const list = useMemo(() => accounts ?? [], [accounts]);
  const key = list.map((a) => a.reportId).join(",");
  const [loaded, setLoaded] = useState<Record<string, TerritoryRow | null>>({});

  useEffect(() => {
    let live = true;
    for (const a of list) {
      loadReport(a.reportId).then((rep) => {
        if (live) setLoaded((m) => ({ ...m, [a.reportId]: rep ? toRow(a, rep) : null }));
      });
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the ids change
  }, [key]);

  return useMemo(() => {
    const rows: TerritoryRow[] = [];
    const missing: string[] = [];
    let loading = false;
    for (const a of list) {
      const r = loaded[a.reportId];
      if (r === undefined) loading = true;
      else if (r === null) missing.push(a.company);
      else rows.push(r);
    }
    return { rows, loading, missing };
  }, [list, loaded]);
}
