// Text matching shared by the account lens and the job-board scan: accent
// folding, loose word matching ("powerbi" = "Power BI") and finding where a
// text names a company without matching common words ("chime in").

/** Lowercase letters and digits only, accents folded ("Café" -> "cafe"). */
export const squash = (s: string) => fold(s).toLowerCase().replace(/[^a-z0-9]/g, "");
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Word-bounded, with optional spaces, dots or hyphens between letters: "powerbi" matches "Power BI". */
export const looseWord = (key: string) => new RegExp(`\\b${key.split("").map(escapeRe).join("[\\s.\\-&']?")}\\b`, "i");

const LEGAL_SUFFIX = /[\s,]+(?:inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh)\.?$/i;

/**
 * Where a source names the company: "Guitar Center", "guitarcenter.com" and
 * "incident.io" as whole words. A name must be capitalized or written as typed,
 * so "Chime" counts and "chime in" doesn't.
 */
export function companyHits(text: string, company: string): number[] {
  const typed = company.trim();
  const host = typed.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
  const isDomain = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host);
  const patterns = isDomain
    ? [host, host.split(".")[0]].map(squash).filter((k) => k.length >= 2).map(looseWord)
    : [typed.replace(LEGAL_SUFFIX, "")]
        .map((n) => fold(n).split(/[\s-]+/).filter(Boolean).map(escapeRe).join("[\\s-]*"))
        .filter((k) => k.length >= 2)
        .map((k) => new RegExp(`\\b${k}\\b`, "gi"));
  const folded = fold(text);
  const hits: number[] = [];
  for (const re of patterns) {
    for (const m of folded.matchAll(new RegExp(re.source, "gi"))) {
      const word = m[0];
      if (/^[A-Z0-9]/.test(word) || word === fold(typed) || isDomain) hits.push(m.index ?? 0);
    }
  }
  return hits.sort((a, b) => a - b);
}

export function mentionsCompany(text: string, company: string): boolean {
  return companyHits(text, company).length > 0;
}

const DOMAIN = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\/?$/i;

/**
 * What the user typed, split into a name and a domain: "Bandwidth (bandwidth.com)",
 * "Bandwidth, bandwidth.com" and "Bandwidth - bandwidth.com" give name "Bandwidth"
 * and domain "bandwidth.com". A bare domain is both; a bare name has no domain.
 */
export function parseCompany(raw: string): { name: string; domain?: string } {
  const typed = raw.trim();
  const paired =
    /^(.+?)\s*[([]\s*([^()[\]\s]+)\s*[)\]]$/.exec(typed) ?? /^(.+?)\s*(?:,|\s[-–—|]\s)\s*(\S+)$/.exec(typed);
  if (paired) {
    const d = DOMAIN.exec(paired[2]);
    if (d && paired[1].trim()) return { name: paired[1].trim(), domain: d[1].toLowerCase() };
  }
  const d = DOMAIN.exec(typed);
  return d ? { name: typed, domain: d[1].toLowerCase() } : { name: typed };
}

/** "investors.bandwidth.com" -> "bandwidth"; "shop.example.co.uk" -> "example". */
export function siteStem(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
  const labels = host.replace(/^www\./, "").split(".");
  if (labels.length < 2) return labels[0] ?? "";
  const secondLevel = labels.length >= 3 && /^(?:co|com|org|net|ac|gov|edu)$/.test(labels[labels.length - 2]);
  return labels[labels.length - (secondLevel ? 3 : 2)];
}

/** A page on the company's own site: its domain, or a host named after it ("bandwidth.com" for Bandwidth). */
export function isOwnSite(url: string, company: string, domain?: string): boolean {
  const stem = siteStem(url);
  if (!stem) return false;
  if (domain && stem === squash(domain.split(".")[0])) return true;
  const name = squash(company.replace(LEGAL_SUFFIX, ""));
  return name.length >= 3 && squash(stem) === name;
}

// Job-board aggregators mix employers on one page: the title naming the company isn't enough.
const AGGREGATOR = /(^|\.)(ziprecruiter|indeed|glassdoor|simplyhired|talent|jooble|bebee|careerbuilder|monster|adzuna|lensa|jobleads|whatjobs|jobrapido)\./i;
export function isAggregator(url: string): boolean {
  try {
    return AGGREGATOR.test(new URL(url).hostname);
  } catch {
    return false;
  }
}
