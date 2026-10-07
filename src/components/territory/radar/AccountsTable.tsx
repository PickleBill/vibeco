import { useState } from "react";
import { Link } from "react-router-dom";
import type { TerritorySegment } from "@/lib/sellers";
import { CompanyName } from "../company/CompanyName";
import { fitRank, omniRank } from "../model";
import { moduleHref } from "../nav";
import { cx } from "../style";
import { FieldPill, FitBadge } from "../ui";
import { dayLabel } from "./evidence";
import type { RadarAccount } from "./model";
import { Chips, StackPill } from "./pieces";
import { OmniTag } from "./segments";

type SortKey = "name" | "segment" | "motion" | "fit" | "omni" | "days";
type ColKey = SortKey | "trigger" | "stack" | "next" | "open";

/** Stack chips per row before "+n more". */
const STACK_CAP = 4;

// Widths step up at xl. Next move joins at 1400px and Open (with the row
// numbers) at 2xl, so the sheet fits a presenter's 125% window without
// scrolling; below that the account cell (which opens the account in focus,
// with its links) and the name's brief stand in for Open.
const COLS: { key: ColKey; label: string; sort?: SortKey; cls?: string }[] = [
  { key: "name", label: "Account", sort: "name", cls: "w-[160px] xl:w-[176px]" },
  { key: "segment", label: "Segment", sort: "segment", cls: "w-[92px] xl:w-[100px]" },
  { key: "motion", label: "Motion", sort: "motion", cls: "w-[110px] xl:w-[114px]" },
  { key: "fit", label: "Fit", sort: "fit", cls: "w-[48px] xl:w-[56px]" },
  { key: "omni", label: "Omni", sort: "omni", cls: "w-[112px] xl:w-[128px]" },
  { key: "trigger", label: "Freshest trigger" },
  { key: "days", label: "Days since", sort: "days", cls: "w-[56px] xl:w-[72px]" },
  { key: "stack", label: "Stack", cls: "w-[128px] xl:w-[160px]" },
  { key: "next", label: "Next move", cls: "hidden w-[160px] min-[1400px]:table-cell" },
  { key: "open", label: "", cls: "hidden w-[76px] 2xl:table-cell" },
];

/**
 * Every account as a spreadsheet: lettered columns, a frozen account column,
 * sortable headers (Account, Segment, Motion, Fit, Omni, Days since). The
 * account cell opens the account in focus and its name a quick brief; Open
 * goes to the full run. On a phone it scrolls sideways in its box. The
 * Segment column shows only when the territory is split into segments.
 */
export function AccountsTable({
  accounts,
  seller,
  segments = [],
  focusId,
  onFocus,
}: {
  accounts: RadarAccount[];
  seller: string;
  segments?: TerritorySegment[];
  focusId?: string | null;
  onFocus: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "days", dir: 1 });
  const segOrder = (id?: string) => {
    const i = segments.findIndex((s) => s.id === id);
    return i < 0 ? segments.length : i;
  };
  const sortValue = (a: RadarAccount, k: SortKey): string | number =>
    k === "name"
      ? a.row.name.toLowerCase()
      : k === "segment"
        ? segOrder(a.row.segment)
        : k === "motion"
          ? a.row.motion
          : k === "fit"
            ? fitRank(a.row.fit)
            : k === "omni"
              ? omniRank(a.row.omni)
              : a.trigger?.days ?? Number.MAX_SAFE_INTEGER;
  const rows = [...accounts].sort((a, b) => {
    const p = sortValue(a, sort.key);
    const q = sortValue(b, sort.key);
    return (p < q ? -sort.dir : p > q ? sort.dir : 0) || a.row.name.localeCompare(b.row.name);
  });
  const cols = COLS.filter((c) => c.key !== "segment" || segments.length > 0).map((c, i) => ({ ...c, letter: String.fromCharCode(65 + i) }));
  const label = cols.find((c) => c.sort === sort.key)?.label.toLowerCase();
  const pick = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));
  const note = (id?: string) => segments.find((s) => s.id === id)?.note;

  const cell = (key: ColKey, a: RadarAccount) => {
    const { row, trigger } = a;
    switch (key) {
      case "segment":
        return row.segment ? (
          <span title={note(row.segment) ? `${row.segment} · ${note(row.segment)}` : undefined} className="text-sm font-medium">
            {row.segment}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      case "motion":
        return <FieldPill>{row.motion}</FieldPill>;
      case "fit":
        return <FitBadge grade={row.fit} label={false} />;
      case "omni":
        return <OmniTag status={row.omni} quiet />;
      case "trigger":
        return trigger ? (
          <div className="flex flex-col items-start gap-1.5">
            <span className="line-clamp-3 text-sm leading-snug">{trigger.text}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-xs text-[#4A4F63]">{dayLabel(trigger.date)}</span>
              <Chips ids={trigger.sources.slice(0, 2)} sources={a.sources} />
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No dated trigger found</span>
        );
      case "days":
        return trigger ? trigger.days : "—";
      case "stack":
        return a.stack.length ? (
          <span className="flex flex-wrap items-center gap-1.5">
            {a.stack.slice(0, STACK_CAP).map((s) => (
              <StackPill key={`${s.tool}-${s.status}`} chip={s} />
            ))}
            {a.stack.length > STACK_CAP && (
              <span className="text-xs text-muted-foreground" title={a.stack.slice(STACK_CAP).map((s) => `${s.tool} (${s.status})`).join(", ")}>
                +{a.stack.length - STACK_CAP} more
              </span>
            )}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Nothing confirmed</span>
        );
      case "next":
        return <span className="line-clamp-3">{a.nextMove}</span>;
      case "open":
        return (
          <Link
            to={moduleHref(seller, "account", row.id)}
            aria-label={`Open ${row.name}'s full run`}
            className="flex min-h-11 w-full items-center justify-center rounded-lg border border-foreground bg-white text-[13px] font-bold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open
          </Link>
        );
      default:
        return null;
    }
  };

  const tdCls: Partial<Record<ColKey, string>> = {
    days: "text-right font-mono text-[15px] font-semibold",
    next: "text-sm leading-snug",
  };

  return (
    <div>
      <p className="mb-3 px-4 pt-4 text-[15px] text-[#4A4F63] sm:px-6 sm:pt-5">
        {accounts.length} accounts · sorted by {label}
      </p>
      {/* Positioned, so the cells' screen-reader text scrolls with the sheet instead of widening the page. */}
      <div className="relative overflow-x-auto border-t border-border">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-left text-[15px] min-[1400px]:min-w-[1080px] 2xl:min-w-[1200px]">
          <caption className="sr-only">All accounts in the territory</caption>
          <thead>
            <tr className="border-b border-[#D9D4C7] bg-muted">
              <th scope="col" className="sticky left-0 z-10 hidden w-10 border-r border-border bg-muted px-2 py-1.5 align-bottom font-mono text-xs font-normal text-muted-foreground 2xl:table-cell">
                #
              </th>
              {cols.map((c, i) => {
                const on = c.sort === sort.key;
                const head = (
                  <>
                    <span className="block font-mono text-xs font-normal text-muted-foreground">{c.letter}</span>
                    <span className="block text-sm font-bold text-foreground">
                      {c.label}
                      {on && <span className="ml-1 text-primary">{sort.dir === 1 ? "↑" : "↓"}</span>}
                    </span>
                  </>
                );
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={c.sort ? (on ? (sort.dir === 1 ? "ascending" : "descending") : "none") : undefined}
                    className={cx("border-r border-border p-0 align-bottom last:border-r-0", c.cls, i === 0 && "sticky left-0 z-10 bg-muted 2xl:left-10")}
                  >
                    {c.sort ? (
                      <button
                        type="button"
                        onClick={() => pick(c.sort!)}
                        className="flex min-h-[52px] w-full flex-col justify-center px-2.5 py-1.5 text-left hover:bg-[#ECE8DE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        {head}
                      </button>
                    ) : (
                      <div className="flex min-h-[52px] flex-col justify-center px-2.5 py-1.5">{head}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const { row } = a;
              const on = focusId === row.id;
              const bg = on ? "bg-brand-tint" : "bg-white";
              return (
                <tr key={row.id} className={cx("border-b border-[#ECE8DE] align-top", bg)}>
                  <td className="sticky left-0 z-10 hidden border-r border-[#ECE8DE] bg-background px-2 py-2.5 font-mono text-xs text-muted-foreground 2xl:table-cell">{i + 1}</td>
                  <td className={cx("sticky left-0 z-10 border-r border-[#ECE8DE] px-2.5 py-2 2xl:left-10", bg)}>
                    {/* The cell opens the account in focus; the name, above it, opens the brief. */}
                    <button
                      type="button"
                      onClick={() => onFocus(row.id)}
                      aria-pressed={on}
                      aria-label={`Quick look at ${row.name}`}
                      className="absolute inset-0 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    />
                    <span className="pointer-events-none relative flex items-center gap-1.5">
                      <span aria-hidden className={cx("h-2 w-2 shrink-0 rounded-full", a.pulse ? "bg-brand" : "bg-transparent")} />
                      <CompanyName row={row} seller={seller} className="pointer-events-auto min-w-0 font-bold" />
                    </span>
                  </td>
                  {cols.slice(1).map((c) => (
                    <td
                      key={c.key}
                      className={cx(
                        "border-r border-[#ECE8DE] last:border-r-0",
                        c.key === "open" ? "hidden px-2 py-2 2xl:table-cell" : "px-2.5 py-2.5",
                        c.key === "next" && "hidden min-[1400px]:table-cell",
                        tdCls[c.key],
                      )}
                    >
                      {cell(c.key, a)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
