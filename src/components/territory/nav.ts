// The command center's views and their URLs.
import { possessive } from "./committee/model";

export type ModuleId = "radar" | "account" | "committee" | "deal" | "lookalikes";

/** The rail, in the order the story runs: what moved, run one, the room, the brief, more like the winners. `short` is the phone tab. */
export const MODULES: { id: ModuleId; idx: string; label: string; short: string; hint: string }[] = [
  { id: "radar", idx: "01", label: "Radar", short: "Radar", hint: "What changed in the territory" },
  { id: "account", idx: "02", label: "Run an account", short: "Run", hint: "Live research, seven agents" },
  { id: "committee", idx: "03", label: "Committee", short: "Committee", hint: "Simulate the buying room" },
  { id: "deal", idx: "04", label: "Deal Room", short: "Deal Room", hint: "A brief they can correct" },
  { id: "lookalikes", idx: "05", label: "Lookalikes", short: "Lookalikes", hint: "More like your customers" },
];

export const isModule = (m: string | undefined): m is ModuleId => MODULES.some((x) => x.id === m);

/** /for/omni, /for/omni/committee/<report id>, ... (radar is the front door). */
export const moduleHref = (seller: string, id: ModuleId, reportId?: string) =>
  `/for/${seller}${id === "radar" && !reportId ? "" : `/${id}`}${reportId ? `/${reportId}` : ""}`;

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
 * radar, the freshest one): radar → run → committee → deal room → lookalikes
 * → back to the radar. Null when the step needs an account and there isn't one.
 */
export function nextStep(seller: string, from: ModuleId, account?: { id: string; name: string }): NextStepTarget | null {
  if (from === "lookalikes") return { to: "radar", label: "Back to the radar", href: moduleHref(seller, "radar") };
  if (!account?.id || !account.name) return null;
  const { id, name } = account;
  switch (from) {
    case "radar":
      return { to: "account", label: `Open ${name}`, href: moduleHref(seller, "account", id) };
    case "account":
      return { to: "committee", label: `Simulate ${possessive(name)} committee`, href: moduleHref(seller, "committee", id) };
    case "committee":
      return { to: "deal", label: `Build ${possessive(name)} Deal Room brief`, href: moduleHref(seller, "deal", id) };
    case "deal":
      return { to: "lookalikes", label: `Find accounts like ${name}`, href: moduleHref(seller, "lookalikes", id) };
  }
}
