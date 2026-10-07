import { useState } from "react";
import { Link } from "react-router-dom";
import { fitRank } from "../model";
import { moduleHref } from "../nav";
import { cx } from "../style";
import { FieldPill, FitBadge } from "../ui";
import { dayLabel } from "./evidence";
import type { RadarAccount } from "./model";
import { Chips, StackPill } from "./pieces";

type SortKey = "name" | "motion" | "fit" | "days";

/** Stack chips per row before "+n more". */
const STACK_CAP = 4;

const COLS: { key: SortKey | "trigger" | "stack" | "next" | "open"; letter: string; label: string; sort?: SortKey; cls?: string }[] = [
  { key: "name", letter: "A", label: "Account", sort: "name", cls: "w-[150px] xl:w-[170px]" },
  { key: "motion", letter: "B", label: "Motion", sort: "motion", cls: "w-[96px] xl:w-[108px]" },
  { key: "fit", letter: "C", label: "Fit", sort: "fit", cls: "w-[52px] xl:w-[60px]" },
  { key: "trigger", letter: "D", label: "Freshest trigger" },
  { key: "days", letter: "E", label: "Days since", sort: "days", cls: "w-[60px] xl:w-[78px]" },
  { key: "stack", letter: "F", label: "Stack", cls: "w-[150px] xl:w-[170px]" },
  { key: "next", letter: "G", label: "Next move", cls: "w-[150px] xl:w-[170px]" },
  // Below xl the name (which opens the account in focus, with its links) stands in for Open.
  { key: "open", letter: "H", label: "", cls: "hidden w-[76px] xl:table-cell" },
];

const sortValue = (a: RadarAccount, k: SortKey): string | number =>
  k === "name" ? a.row.name.toLowerCase() : k === "motion" ? a.row.motion : k === "fit" ? fitRank(a.row.fit) : a.trigger?.days ?? Number.MAX_SAFE_INTEGER;

/**
 * Every account as a spreadsheet: lettered columns, a frozen account column,
 * sortable headers (Account, Motion, Fit, Days since). The name opens the
 * account in focus; Open goes to the full run. Under xl the row numbers and
 * Open step aside so the sheet fits a presenter's 125% window; on a phone it
 * scrolls sideways in its box.
 */
export function AccountsTable({
  accounts,
  seller,
  focusId,
  onFocus,
}: {
  accounts: RadarAccount[];
  seller: string;
  focusId?: string | null;
  onFocus: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "days", dir: 1 });
  const rows = [...accounts].sort((a, b) => {
    const p = sortValue(a, sort.key);
    const q = sortValue(b, sort.key);
    return (p < q ? -sort.dir : p > q ? sort.dir : 0) || a.row.name.localeCompare(b.row.name);
  });
  const label = COLS.find((c) => c.sort === sort.key)?.label.toLowerCase();
  const pick = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 pt-4 sm:px-6 sm:pt-5">
        <p className="text-[15px] text-[#4A4F63]">
          {accounts.length} accounts · sorted by {label} · select a header to sort
        </p>
        <p className="font-mono text-xs text-muted-foreground">pink dot = trigger in the last 30 days</p>
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[820px] table-fixed xl:min-w-[980px] border-collapse text-left text-[15px]">
          <caption className="sr-only">All accounts in the territory</caption>
          <thead>
            <tr className="border-b border-[#D9D4C7] bg-muted">
              <th scope="col" className="sticky left-0 z-10 hidden w-10 border-r border-border bg-muted px-2 py-1.5 align-bottom font-mono text-xs font-normal text-muted-foreground xl:table-cell">
                #
              </th>
              {COLS.map((c, i) => {
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
                    className={cx("border-r border-border p-0 align-bottom last:border-r-0", c.cls, i === 0 && "sticky left-0 z-10 bg-muted xl:left-10")}
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
              const { row, trigger } = a;
              const on = focusId === row.id;
              const bg = on ? "bg-brand-tint" : "bg-white";
              return (
                <tr key={row.id} className={cx("border-b border-[#ECE8DE] align-top", bg)}>
                  <td className="sticky left-0 z-10 hidden border-r border-[#ECE8DE] bg-background px-2 py-2.5 font-mono text-xs text-muted-foreground xl:table-cell">{i + 1}</td>
                  <td className={cx("sticky left-0 z-10 border-r border-[#ECE8DE] px-2.5 py-2 xl:left-10", bg)}>
                    <button
                      type="button"
                      onClick={() => onFocus(row.id)}
                      aria-pressed={on}
                      className="flex min-h-11 w-full flex-col items-start justify-center rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-1.5 font-bold hover:underline">
                        <span aria-hidden className={cx("h-2 w-2 shrink-0 rounded-full", a.pulse ? "bg-brand" : "bg-transparent")} />
                        {row.name}
                      </span>
                      {row.domain && <span className="pl-3.5 font-mono text-xs text-muted-foreground">{row.domain}</span>}
                    </button>
                  </td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5">
                    <FieldPill>{row.motion}</FieldPill>
                  </td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5">
                    <FitBadge grade={row.fit} label={false} />
                  </td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5">
                    {trigger ? (
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="line-clamp-3 text-sm leading-snug">{trigger.text}</span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs text-[#4A4F63]">{dayLabel(trigger.date)}</span>
                          <Chips ids={trigger.sources.slice(0, 2)} sources={a.sources} />
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No dated trigger found</span>
                    )}
                  </td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5 text-right font-mono text-[15px] font-semibold">{trigger ? trigger.days : "—"}</td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5">
                    {a.stack.length ? (
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
                    )}
                  </td>
                  <td className="border-r border-[#ECE8DE] px-2.5 py-2.5 text-sm leading-snug">
                    <span className="line-clamp-3">{a.nextMove}</span>
                  </td>
                  <td className="hidden px-2 py-2 xl:table-cell">
                    <Link
                      to={moduleHref(seller, "account", row.id)}
                      aria-label={`Open ${row.name}'s full run`}
                      className="flex min-h-11 w-full items-center justify-center rounded-lg border border-foreground bg-white text-[13px] font-bold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
