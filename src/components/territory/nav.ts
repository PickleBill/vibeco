// The command center's views and their URLs.

export type ModuleId = "radar" | "account" | "committee" | "deal" | "lookalikes";

/** The rail, in the order the story runs: what moved, run one, the room, the brief, more like the winners. */
export const MODULES: { id: ModuleId; idx: string; label: string; hint: string }[] = [
  { id: "radar", idx: "01", label: "Radar", hint: "What changed in the territory" },
  { id: "account", idx: "02", label: "Run an account", hint: "Live research, seven agents" },
  { id: "committee", idx: "03", label: "Committee", hint: "Simulate the buying room" },
  { id: "deal", idx: "04", label: "Deal Room", hint: "A brief they can correct" },
  { id: "lookalikes", idx: "05", label: "Lookalikes", hint: "More like your customers" },
];

export const isModule = (m: string | undefined): m is ModuleId => MODULES.some((x) => x.id === m);

/** /for/omni, /for/omni/committee/<report id>, ... (radar is the front door). */
export const moduleHref = (seller: string, id: ModuleId, reportId?: string) =>
  `/for/${seller}${id === "radar" && !reportId ? "" : `/${id}`}${reportId ? `/${reportId}` : ""}`;
