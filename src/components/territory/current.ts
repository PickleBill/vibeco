// The account the command center is about, carried from view to view: the
// one in the URL, else the last one opened this session, else the territory's
// first. The committee and the deal room open on it; Run an account always
// opens on the empty form. A run
// from outside the territory (a company just run live) is also kept as "just
// ran", so the pickers in the other views can offer it.
import { useEffect, useState } from "react";

const KEY = "vibeco.territory.current";
const RAN_KEY = "vibeco.territory.ran";

/** The last account opened in this tab for a seller, if storage allows. */
export function readCurrent(seller: string | undefined): string | undefined {
  if (!seller) return undefined;
  try {
    const all = JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Record<string, unknown>;
    const id = all[seller];
    return typeof id === "string" && id ? id : undefined;
  } catch {
    return undefined;
  }
}

export function rememberCurrent(seller: string, id: string) {
  try {
    const all = JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Record<string, string>;
    all[seller] = id;
    window.sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage blocked (private window): the account just isn't carried past this URL.
  }
}

/** A run opened in "Run an account" this session that isn't a territory account. */
export interface JustRan {
  id: string;
  name: string;
}

/** The last run outside the territory opened in this tab for a seller, if storage allows. */
export function readRan(seller: string | undefined): JustRan | undefined {
  if (!seller) return undefined;
  try {
    const all = JSON.parse(window.sessionStorage.getItem(RAN_KEY) ?? "{}") as Record<string, Partial<JustRan> | undefined>;
    const r = all[seller];
    return r && typeof r.id === "string" && r.id && typeof r.name === "string" && r.name ? { id: r.id, name: r.name } : undefined;
  } catch {
    return undefined;
  }
}

export function rememberRan(seller: string, ran: JustRan) {
  try {
    const all = JSON.parse(window.sessionStorage.getItem(RAN_KEY) ?? "{}") as Record<string, JustRan>;
    all[seller] = ran;
    window.sessionStorage.setItem(RAN_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: the run is still the URL's account, just not offered once you leave it.
  }
}

export interface CurrentAccount {
  /** The account one-account views open on: URL, then session, then the territory's first. */
  id?: string;
  /** The last run outside the territory opened this session ("Just ran" in the pickers). */
  ran?: JustRan;
}

/** URL id wins, then the session's, then the first territory account. */
export function pickCurrent({ urlId, sessionId, accounts }: { urlId?: string; sessionId?: string; accounts: { reportId: string }[] }): CurrentAccount {
  return { id: urlId || sessionId || accounts[0]?.reportId };
}

/** The current account for this page; an id in the URL becomes the session's. */
export function useCurrentAccount(seller: string | undefined, urlId: string | undefined, accounts: { reportId: string }[] = []): CurrentAccount {
  const [sessionId, setSessionId] = useState(() => readCurrent(seller));
  const [ran, setRan] = useState(() => readRan(seller));
  useEffect(() => {
    if (!seller) return;
    if (urlId) {
      rememberCurrent(seller, urlId);
      setSessionId(urlId);
    } else setSessionId(readCurrent(seller));
    setRan(readRan(seller));
  }, [seller, urlId]);
  const picked = pickCurrent({ urlId, sessionId, accounts });
  // A territory account is already in every picker.
  return ran && !accounts.some((a) => a.reportId === ran.id) ? { ...picked, ran } : picked;
}
