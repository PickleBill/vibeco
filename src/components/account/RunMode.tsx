import { FieldPill, LivePill } from "@/components/territory/ui";
import { ranAt } from "./explorer/savedRuns";

/** A live run's clock: "0:23", "1:05". */
const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The tag at the top of every result, saying which kind of run is on screen:
 * a saved run (opened from stored data) or a live one (its clock while it
 * runs, its time once done). A tag, so never clickable.
 */
export function RunMode(
  props: { kind: "saved"; savedAt?: string | null } | { kind: "live"; status: "running" | "done" | "error"; ms: number },
) {
  if (props.kind === "saved") {
    const when = props.savedAt ? ranAt(props.savedAt) : "";
    return (
      <p className="flex items-center">
        <FieldPill className="h-8 text-sm">
          Saved run{when ? ` · ${when}` : ""}
        </FieldPill>
      </p>
    );
  }
  const { status, ms } = props;
  return (
    <p className="flex items-center">
      <LivePill>
        Live run ·{" "}
        {status === "running" ? (
          <span className="font-mono text-[13px] font-medium tabular-nums">{clock(ms)}</span>
        ) : status === "done" ? (
          `done in ${Math.round(ms / 1000)}s`
        ) : (
          "stopped"
        )}
      </LivePill>
    </p>
  );
}
