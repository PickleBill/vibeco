import { useEffect, useMemo, useRef, useState } from "react";
import { loadReport, type SavedReport } from "@/components/account/explorer/savedRuns";
import type { Segment, SellerConfig } from "@/lib/sellers";
import { omniRank, splitCompany, toRow, type OmniStatus, type TerritoryRow } from "../model";

export interface SeedOption {
  /** The seed's saved run; customers without one can't seed yet. */
  reportId?: string;
  name: string;
  /** "recent": a run from outside the territory opened this session ("Just ran"). */
  kind: "customer" | "territory" | "recent";
  /** Where the seller's public list names a customer. */
  source?: string;
  /** Why a customer seeds: on the public list (Confirmed) or named in its job posts (Likely). */
  omni?: OmniStatus;
  /** A territory account's segment, to group the picker. */
  segment?: Segment;
  /** For the logo on the seed card. */
  domain?: string;
}

/**
 * The seller's public customers first, then territory accounts whose run
 * puts Omni there (on the list, then named in job posts: natural seeds),
 * then every other territory account. No repeats. An extra seed (the run
 * just made in "Run an account") goes first unless it's already listed.
 */
export function seedOptions(seller: SellerConfig, rows: TerritoryRow[], extra?: { id: string; name: string }): SeedOption[] {
  const domainOf = (id?: string) => rows.find((r) => r.id === id)?.domain;
  const customers: SeedOption[] = (seller.seeds ?? []).map((s) => ({
    reportId: s.reportId,
    name: s.name,
    kind: "customer",
    source: s.source,
    omni: "Confirmed",
    domain: domainOf(s.reportId) ?? splitCompany(s.name).domain,
  }));
  const taken = new Set(customers.map((c) => c.reportId).filter(Boolean));
  const evidence: SeedOption[] = rows
    .filter((r) => r.omni !== "None found" && !taken.has(r.id))
    .sort((a, b) => omniRank(a.omni) - omniRank(b.omni) || a.name.localeCompare(b.name))
    .map((r) => ({ reportId: r.id, name: r.name, kind: "customer", source: r.report.brief?.customer_list?.source, omni: r.omni, domain: r.domain }));
  for (const e of evidence) taken.add(e.reportId);
  const accounts: SeedOption[] = (seller.territory?.accounts ?? [])
    .filter((a) => !taken.has(a.reportId))
    .map((a) => ({
      reportId: a.reportId,
      name: rows.find((r) => r.id === a.reportId)?.name ?? splitCompany(a.company).name,
      kind: "territory",
      segment: a.segment,
      domain: domainOf(a.reportId) ?? splitCompany(a.company).domain,
    }));
  const listed = [...customers, ...evidence, ...accounts];
  if (!extra?.id || listed.some((o) => o.reportId === extra.id)) return listed;
  return [{ reportId: extra.id, name: extra.name, kind: "recent" }, ...listed];
}

/** First customer with a saved run, else the first territory account. */
export const defaultSeed = (options: SeedOption[]) => options.find((o) => o.kind === "customer" && o.reportId)?.reportId ?? options.find((o) => o.reportId)?.reportId;

/**
 * The seed's run as a row: from the territory when it's there, otherwise
 * loaded by id (a customer's own run). Seed cards with no domain (a
 * customer named without one) have their runs read too, once, for their
 * logos: `domains` by report id.
 */
export function useSeedRow(
  reportId: string | undefined,
  rows: TerritoryRow[],
  options: SeedOption[],
): { row?: TerritoryRow; loading: boolean; failed: boolean; domains: Record<string, string> } {
  const inTerritory = rows.find((r) => r.id === reportId);
  const [loaded, setLoaded] = useState<Record<string, SavedReport | null>>({});
  const wanted = useMemo(
    () => [
      ...(reportId && !inTerritory ? [reportId] : []),
      ...options.filter((o) => o.kind !== "territory" && o.reportId && !o.domain && !rows.some((r) => r.id === o.reportId)).map((o) => o.reportId as string),
    ],
    [reportId, inTerritory, options, rows],
  );
  // Each run is asked for once; answers land while the view is mounted.
  const asked = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    for (const id of new Set(wanted)) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      loadReport(id)
        .catch(() => null)
        .then((rep) => {
          if (mounted.current) setLoaded((m) => ({ ...m, [id]: rep }));
        });
    }
  }, [wanted]);

  return useMemo(() => {
    const rowOf = (id: string) => {
      const rep = loaded[id];
      const opt = options.find((o) => o.reportId === id);
      return rep ? toRow({ company: rep.idea || opt?.name || "", reportId: id }, rep) : undefined;
    };
    const domains: Record<string, string> = {};
    for (const id of Object.keys(loaded)) {
      const d = rowOf(id)?.domain;
      if (d) domains[id] = d;
    }
    if (!reportId) return { loading: false, failed: false, domains };
    if (inTerritory) return { row: inTerritory, loading: false, failed: false, domains };
    const rep = loaded[reportId];
    if (rep === undefined) return { loading: true, failed: false, domains };
    if (!rep) return { loading: false, failed: true, domains };
    return { row: rowOf(reportId), loading: false, failed: false, domains };
  }, [reportId, inTerritory, loaded, options]);
}
