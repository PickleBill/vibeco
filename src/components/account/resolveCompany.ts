import type { SellerConfig } from "@/lib/sellers";

export type Resolved = { kind: "seller" } | { kind: "run"; company: string };

const domainOf = (s: string) => /\(([a-z0-9.-]+\.[a-z]{2,})\)\s*$/i.exec(s)?.[1]?.toLowerCase() ?? (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(s.trim()) ? s.trim().toLowerCase().replace(/^www\./, "") : undefined);
const nameOf = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();

/**
 * What a typed company runs as. The seller itself is caught before any call
 * ("Omni", "omni.co"). A bare name that matches an account in the territory
 * runs with that account's domain, so "Relay" researches Relay (relaypro.com)
 * and not another company with the same name.
 */
export function resolveCompany(name: string, seller?: Pick<SellerConfig, "name" | "domain" | "savedRuns" | "territory">): Resolved {
  if (!seller) return { kind: "run", company: name };
  const typedDomain = domainOf(name);
  const own = seller.domain?.toLowerCase();
  if (nameOf(name) === seller.name.toLowerCase() || (own && typedDomain === own)) return { kind: "seller" };
  if (typedDomain) return { kind: "run", company: name };
  const known = [...seller.savedRuns, ...(seller.territory?.accounts ?? [])].find((a) => domainOf(a.company) && nameOf(a.company) === nameOf(name));
  return { kind: "run", company: known?.company ?? name };
}
