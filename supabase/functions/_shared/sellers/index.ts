// Seller profiles for the "account" lens: who the user sells for, so an
// account brief can be written from that seller's point of view.
// Facts live in one file per seller (e.g. ./omni.ts); this module matches
// companies against the public customer list and builds prompt context.
// Labels for the UI live in src/lib/sellers.ts.
import { OMNI } from "./omni.ts";

export interface SellerCustomer {
  name: string;
  /** Public page that names this customer. */
  source: string;
  /** Other ways people write the name (matched exactly after normalizing). */
  aliases?: string[];
  /** Common-word names: ask the seller to confirm it's the same company. */
  ambiguous?: boolean;
}

export interface SellerProfile {
  id: string;
  name: string;
  sells: string;
  motions: string[];
  warehouses: string[];
  biTools: string[];
  signals: string[];
  customers: SellerCustomer[];
}

const SELLERS: Record<string, SellerProfile> = { omni: OMNI };

/** `seller` arrives in request bodies and stored briefs: accept known ids only. */
export function asSeller(value: unknown): SellerProfile | undefined {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SELLERS, value) ? SELLERS[value] : undefined;
}

const SUFFIXES = /(inc|llc|ltd|corp|corporation|company|co|labs|hq)$/;

/** "Guitar Center", "guitarcenter.com" and "https://www.guitarcenter.com/x" all become "guitarcenter". */
function keysFor(raw: string): string[] {
  let s = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  const keys = new Set<string>();
  const squash = (v: string) => v.replace(/[^a-z0-9]/g, "");
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s)) {
    keys.add(squash(s)); // incident.io -> incidentio
    s = s.split(".")[0]; // guitarcenter.com -> guitarcenter
  }
  const k = squash(s);
  if (k) {
    keys.add(k);
    const stripped = k.replace(SUFFIXES, "");
    if (stripped.length >= 3) keys.add(stripped);
  }
  return [...keys];
}

export interface CustomerListResult {
  onList: boolean;
  /** The listed name, when matched. */
  name?: string;
  source?: string;
  ambiguous?: boolean;
}

/** Exact match after normalizing; no fuzzy matching, so no false "on the list". */
export function matchCustomer(seller: SellerProfile, company: string): CustomerListResult {
  const wanted = new Set(keysFor(company));
  for (const c of seller.customers) {
    const candidates = [c.name, ...(c.aliases ?? [])].flatMap(keysFor);
    if (candidates.some((k) => wanted.has(k))) {
      return { onList: true, name: c.name, source: c.source, ambiguous: c.ambiguous };
    }
  }
  return { onList: false };
}

/** The one sentence the brief and the First-call plan must use, word for word. */
export function customerListSentence(seller: SellerProfile, company: string, match: CustomerListResult): string {
  if (!match.onList) return `${company} is not on ${seller.name}'s public customer list.`;
  const confirm = match.ambiguous ? ` Confirm it's the same company: ${match.source}` : ` Source: ${match.source}`;
  return `${company} is on ${seller.name}'s public customer list (listed as ${match.name}).${confirm}`;
}

/** Seller context for the account-lens system prompt. */
export function sellerPromptBlock(seller: SellerProfile, company: string, match: CustomerListResult): string {
  return `
THE USER SELLS FOR ${seller.name.toUpperCase()}. Public facts about ${seller.name} (use only these; don't add others):
- What it sells: ${seller.sells}
- Why companies buy it: ${seller.motions.join("; ")}.
- Warehouses it works with: ${seller.warehouses.join(", ")}.
- BI tools a prospect may be replacing: ${seller.biTools.join(", ")}.
- Other buying signals: ${seller.signals.join("; ")}.
- Customer list (decided by code, not by you): ${customerListSentence(seller, company, match)}
Wording rule: say "on ${seller.name}'s public customer list" or "not on ${seller.name}'s public customer list". Never write "not a customer". Don't mention ${seller.name}'s funding or customer counts.`;
}

/** One-paragraph seller note for downstream agents (critics, synthesis). */
export function sellerAgentNote(seller: SellerProfile): string {
  return `\nThe user sells for ${seller.name}: ${seller.sells} Typical reasons to buy: ${seller.motions.join("; ")}. Speak to whether and how ${seller.name} could help this account; don't invent facts about ${seller.name}.`;
}
