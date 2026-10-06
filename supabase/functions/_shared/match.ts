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

