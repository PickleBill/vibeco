// The account the command center is about, carried from view to view: the
// one in the URL, else the last one opened this session, else the territory's
// first. One-account views (run, committee, deal room) open on it.
import { useEffect, useState } from "react";

const KEY = "vibeco.territory.current";

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

export interface CurrentAccount {
  /** The account one-account views open on: URL, then session, then the territory's first. */
  id?: string;
  /** Only an account someone opened (URL or session); "Run an account" carries this one. */
  opened?: string;
}

/** URL id wins, then the session's, then the first territory account. */
export function pickCurrent({ urlId, sessionId, accounts }: { urlId?: string; sessionId?: string; accounts: { reportId: string }[] }): CurrentAccount {
  const opened = urlId || sessionId || undefined;
  return { id: opened ?? accounts[0]?.reportId, opened };
}

/** The current account for this page; an id in the URL becomes the session's. */
export function useCurrentAccount(seller: string | undefined, urlId: string | undefined, accounts: { reportId: string }[] = []): CurrentAccount {
  const [sessionId, setSessionId] = useState(() => readCurrent(seller));
  useEffect(() => {
    if (!seller) return;
    if (urlId) {
      rememberCurrent(seller, urlId);
      setSessionId(urlId);
    } else setSessionId(readCurrent(seller));
  }, [seller, urlId]);
  return pickCurrent({ urlId, sessionId, accounts });
}
