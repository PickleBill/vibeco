import { useEffect, useMemo, useState } from "react";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import type { SellerConfig } from "@/lib/sellers";
import { splitCompany, toRow, type TerritoryRow } from "../model";

export interface SeedOption {
  /** The seed's saved run; customers without one can't seed yet. */
  reportId?: string;
  name: string;
  kind: "customer" | "territory";
  /** Where the seller's public list names a customer. */
  source?: string;
}

/** The seller's public customers first, then every territory account (no repeats). */
export function seedOptions(seller: SellerConfig, rows: TerritoryRow[]): SeedOption[] {
  const customers: SeedOption[] = (seller.seeds ?? []).map((s) => ({ reportId: s.reportId, name: s.name, kind: "customer", source: s.source }));
  const taken = new Set(customers.map((c) => c.reportId).filter(Boolean));
  const accounts: SeedOption[] = (seller.territory?.accounts ?? [])
    .filter((a) => !taken.has(a.reportId))
    .map((a) => ({ reportId: a.reportId, name: rows.find((r) => r.id === a.reportId)?.name ?? splitCompany(a.company).name, kind: "territory" }));
  return [...customers, ...accounts];
}

/** First customer with a saved run, else the first territory account. */
export const defaultSeed = (options: SeedOption[]) => options.find((o) => o.kind === "customer" && o.reportId)?.reportId ?? options.find((o) => o.reportId)?.reportId;

/**
 * The seed's run as a row: from the territory when it's there, otherwise
 * loaded by id (a customer's own run).
 */
export function useSeedRow(reportId: string | undefined, rows: TerritoryRow[], options: SeedOption[]): { row?: TerritoryRow; loading: boolean; failed: boolean } {
  const inTerritory = rows.find((r) => r.id === reportId);
  const [loaded, setLoaded] = useState<Record<string, SavedReport | null>>({});
  useEffect(() => {
    if (!reportId || inTerritory || loaded[reportId] !== undefined) return;
    let live = true;
    loadReport(reportId).then((rep) => {
      if (live) setLoaded((m) => ({ ...m, [reportId]: rep }));
    });
    return () => {
      live = false;
    };
  }, [reportId, inTerritory, loaded]);

  return useMemo(() => {
    if (!reportId) return { loading: false, failed: false };
    if (inTerritory) return { row: inTerritory, loading: false, failed: false };
    const rep = loaded[reportId];
    if (rep === undefined) return { loading: true, failed: false };
    if (!rep) return { loading: false, failed: true };
    const opt = options.find((o) => o.reportId === reportId);
    return { row: toRow({ company: rep.idea || opt?.name || "", reportId }, rep), loading: false, failed: false };
  }, [reportId, inTerritory, loaded, options]);
}
