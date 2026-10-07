import { useId } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Segment, TerritorySegment } from "@/lib/sellers";
import type { JustRan } from "./current";
import { OMNI_TEXT, type TerritoryRow } from "./model";
import { cx } from "./style";

/** More accounts than this and the chips become a select. */
export const SELECT_AFTER = 8;

/** "Kaseya · Internal · Fit C · On the list": what an option says. */
const optionText = (r: TerritoryRow) => [r.name, r.motion, `Fit ${r.fit?.trim() || "?"}`, r.omni !== "None found" ? OMNI_TEXT[r.omni].chip : ""].filter(Boolean).join(" · ");

/** Rows by segment (in the territory's order, unsegmented last), A to Z within each. */
function bySegment(rows: TerritoryRow[], segments: TerritorySegment[]): { key: string; label?: string; rows: TerritoryRow[] }[] {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  if (!sorted.some((r) => r.segment)) return [{ key: "all", rows: sorted }];
  const ids: Segment[] = segments.length ? segments.map((s) => s.id) : ["Strategic", "Enterprise"];
  const groups = ids.map((id) => {
    const s = segments.find((x) => x.id === id);
    return { key: id as string, label: s ? `${s.label} · ${s.note}` : id, rows: sorted.filter((r) => r.segment === id) };
  });
  const rest = sorted.filter((r) => !r.segment || !ids.includes(r.segment));
  return [...groups, { key: "other", label: "Other accounts", rows: rest }].filter((g) => g.rows.length);
}

/**
 * Pick a territory account for a view that works on one account (committee,
 * deal room). A small territory is a row of chips; past eight accounts it's
 * a native select (type a letter to jump), grouped by segment, each option
 * with its motion and fit. A run from outside the territory opened this
 * session comes first, as "Just ran: <Company>".
 */
export function AccountSwitcher({
  rows,
  activeId,
  hrefFor,
  loading,
  label = "Account",
  segments = [],
  justRan,
}: {
  rows: TerritoryRow[];
  activeId?: string;
  hrefFor: (id: string) => string;
  loading?: boolean;
  label?: string;
  /** The territory's segments, for group names and order. */
  segments?: TerritorySegment[];
  /** A run outside the territory, offered first (see current.ts). */
  justRan?: JustRan;
}) {
  const navigate = useNavigate();
  const selectId = useId();
  const spinner = loading && <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label="Loading accounts" />;
  const ran = justRan && !rows.some((r) => r.id === justRan.id) ? justRan : undefined;
  const ranText = ran ? `Just ran: ${ran.name}` : "";

  if (rows.length > SELECT_AFTER) {
    const active = rows.find((r) => r.id === activeId) ?? (ran?.id === activeId ? ran : undefined);
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label htmlFor={selectId} className="font-mono text-[13px] text-muted-foreground">
          {label}
        </label>
        <div className="relative w-full sm:w-[420px]">
          <select
            id={selectId}
            value={active ? active.id : ""}
            onChange={(e) => e.target.value && navigate(hrefFor(e.target.value))}
            className="min-h-12 w-full cursor-pointer appearance-none truncate rounded-[10px] border border-foreground bg-white py-2 pl-3.5 pr-10 text-[15px] font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {!active && <option value="">{activeId ? "A saved run outside the territory" : "Choose an account…"}</option>}
            {ran && <option value={ran.id}>{ranText}</option>}
            {bySegment(rows, segments).map((g) => {
              const options = g.rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {optionText(r)}
                </option>
              ));
              return g.label ? (
                <optgroup key={g.key} label={g.label}>
                  {options}
                </optgroup>
              ) : (
                options
              );
            })}
          </select>
          <ChevronDown size={18} aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{rows.length} accounts</span>
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      <span className="font-mono text-[13px] text-muted-foreground">{label}</span>
      {[...(ran ? [{ id: ran.id, name: ranText, title: ranText }] : []), ...rows.map((r) => ({ id: r.id, name: r.name, title: optionText(r) }))].map((r) => {
        const on = r.id === activeId;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={r.title}
            onClick={() => navigate(hrefFor(r.id))}
            className={cx(
              "inline-flex min-h-11 items-center rounded-full border px-3.5 text-[15px] transition-colors lg:min-h-9 lg:px-3 lg:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary bg-brand-tint font-bold text-foreground" : "border-border bg-white font-medium text-[#4A4F63] hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {r.name}
          </button>
        );
      })}
      {spinner}
    </div>
  );
}
