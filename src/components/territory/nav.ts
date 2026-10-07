// The command center's views and their URLs.
import { possessive } from "./committee/model";

export type ModuleId = "radar" | "account" | "committee" | "deal" | "lookalikes";

/** The rail, in the order the story runs: run one, what moved, more like it, the room, the brief. `short` is the phone tab. */
export const MODULES: { id: ModuleId; idx: string; label: string; short: string; hint: string }[] = [
  { id: "account", idx: "01", label: "Run an account", short: "Run", hint: "Live research, seven agents" },
  { id: "radar", idx: "02", label: "Radar", short: "Radar", hint: "What changed in the territory" },
  { id: "lookalikes", idx: "03", label: "Lookalikes", short: "Lookalikes", hint: "More like your customers" },
  { id: "committee", idx: "04", label: "Committee", short: "Committee", hint: "Simulate the buying room" },
  { id: "deal", idx: "05", label: "Deal Room", short: "Deal Room", hint: "A brief they can correct" },
];

/** The front door: /for/:seller opens on it. */
export const FRONT_DOOR: ModuleId = "account";

export const isModule = (m: string | undefined): m is ModuleId => MODULES.some((x) => x.id === m);

/** /for/omni (run an account, the front door), /for/omni/radar, /for/omni/committee/<report id>, ... */
export const moduleHref = (seller: string, id: ModuleId, reportId?: string) =>
  `/for/${seller}${id === FRONT_DOOR && !reportId ? "" : `/${id}`}${reportId ? `/${reportId}` : ""}`;

/** Where a rail tab goes: one-account views carry the current account; Radar and Lookalikes stay plain. */
export function railHref(seller: string, id: ModuleId, current: { id?: string; opened?: string } = {}) {
  const carry = id === "account" ? current.opened : id === "committee" || id === "deal" ? current.id : undefined;
  return moduleHref(seller, id, carry);
}

export interface NextStepTarget {
  /** The view it goes to. */
  to: ModuleId;
  label: string;
  href: string;
}

/**
 * The next step in the story from a view, for the account it's about (on the
 * radar, the freshest one; on lookalikes, the top match, else the seed): run →
 * lookalikes → committee → run another. The radar opens an account; the deal
 * room, off the main path, goes back to the radar. Null when the step needs
 * an account and there isn't one.
 */
export function nextStep(seller: string, from: ModuleId, account?: { id: string; name: string }): NextStepTarget | null {
  if (from === "committee") return { to: "account", label: "Run another account", href: moduleHref(seller, "account") };
  if (from === "deal") return { to: "radar", label: "Back to the radar", href: moduleHref(seller, "radar") };
  if (!account?.id || !account.name) return null;
  const { id, name } = account;
  switch (from) {
    case "account":
      return { to: "lookalikes", label: `Find accounts like ${name}`, href: moduleHref(seller, "lookalikes", id) };
    case "radar":
      return { to: "account", label: `Open ${name}`, href: moduleHref(seller, "account", id) };
    case "lookalikes":
      return { to: "committee", label: `Simulate ${possessive(name)} committee`, href: moduleHref(seller, "committee", id) };
  }
}
