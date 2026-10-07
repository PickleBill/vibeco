import { useId, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Segment, TerritorySegment } from "@/lib/sellers";
import { accountMeta } from "./accountMeta";
import { CompanyLogo } from "./company/CompanyLogo";
import type { JustRan } from "./current";
import type { TerritoryRow } from "./model";
import { cx } from "./style";

/** More accounts than this and the chips become a searchable list. */
export const SELECT_AFTER = 8;

/** "Kaseya · Internal · Fit C": a chip's tooltip. */
const optionText = (r: TerritoryRow) => [r.name, accountMeta(r)].filter(Boolean).join(" · ");

/** Rows by segment (in the territory's order, unsegmented last), A to Z within each. */
function bySegment(rows: TerritoryRow[], segments: TerritorySegment[]): { key: string; label?: string; rows: TerritoryRow[] }[] {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  if (!sorted.some((r) => r.segment)) return [{ key: "all", rows: sorted }];
  const ids: Segment[] = segments.length ? segments.map((s) => s.id) : ["Strategic", "Enterprise"];
  const groups = ids.map((id) => ({ key: id as string, label: segments.find((x) => x.id === id)?.label ?? id, rows: sorted.filter((r) => r.segment === id) }));
  const rest = sorted.filter((r) => !r.segment || !ids.includes(r.segment));
  return [...groups, { key: "other", label: "Other accounts", rows: rest }].filter((g) => g.rows.length);
}

/** Search by name (and motion), anywhere in the word: "fax" finds Equifax. */
const match = (_value: string, search: string, keywords: string[] = []) => (keywords.some((k) => k.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0);

const item =
  "min-h-11 cursor-pointer gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[15px] text-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground";

/**
 * Pick a territory account for a view that works on one account (committee,
 * deal room). A small territory is a row of chips; past eight accounts it's a
 * button that opens a searchable list, grouped by segment, each account with
 * its logo, motion and fit. A run from outside the territory opened this
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
  const labelId = useId();
  const valueId = useId();
  const [open, setOpen] = useState(false);
  const spinner = loading && <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label="Loading accounts" />;
  const ran = justRan && !rows.some((r) => r.id === justRan.id) ? justRan : undefined;
  const ranText = ran ? `Just ran: ${ran.name}` : "";

  if (rows.length > SELECT_AFTER) {
    const row = rows.find((r) => r.id === activeId);
    const current = row ? { name: row.name, domain: row.domain } : ran?.id === activeId ? { name: ran.name, domain: undefined } : undefined;
    const pick = (id: string) => {
      setOpen(false);
      if (id !== activeId) navigate(hrefFor(id));
    };
    const entry = (id: string, name: string, domain: string | undefined, meta: string, text = name, motion = "") => (
      <CommandItem key={id} value={id} keywords={[name, motion].filter(Boolean)} onSelect={pick} className={item}>
        <CompanyLogo domain={domain} name={name} size={20} />
        <span className={cx("min-w-0 flex-1 truncate", id === activeId ? "font-bold" : "font-medium")}>{text}</span>
        {meta && <span className="shrink-0 text-sm text-muted-foreground">{meta}</span>}
        <Check size={16} aria-hidden className={cx("shrink-0 text-foreground", id === activeId ? "opacity-100" : "opacity-0")} />
      </CommandItem>
    );
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span id={labelId} className="font-mono text-[13px] text-muted-foreground">
          {label}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-labelledby={`${labelId} ${valueId}`}
              className="flex min-h-12 w-full items-center gap-2.5 rounded-[10px] border border-foreground bg-white py-2 pl-3 pr-3 text-left text-[15px] font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-[420px]"
            >
              {current && <CompanyLogo domain={current.domain} name={current.name} size={20} />}
              <span id={valueId} className={cx("min-w-0 flex-1 truncate", !current && "font-medium text-[#4A4F63]")}>
                {current ? current.name : activeId ? "A saved run outside the territory" : "Choose an account…"}
              </span>
              <ChevronDown size={18} aria-hidden className={cx("shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            collisionPadding={16}
            className="w-[var(--radix-popover-trigger-width)] min-w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-[10px] border-border p-0 shadow-lg"
          >
            <Command label="Search accounts" filter={match} defaultValue={activeId}>
              <CommandInput placeholder="Search accounts" className="h-12 text-base" />
              <CommandList className="max-h-[min(360px,calc(var(--radix-popover-content-available-height)-56px))] p-1">
                <CommandEmpty className="px-3 py-6 text-center text-[15px] text-[#4A4F63]">No account matches.</CommandEmpty>
                {ran && <CommandGroup className="p-0">{entry(ran.id, ran.name, undefined, "", ranText)}</CommandGroup>}
                {bySegment(rows, segments).map((g) => (
                  <CommandGroup
                    key={g.key}
                    heading={g.label}
                    className="p-0 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em]"
                  >
                    {g.rows.map((r) => entry(r.id, r.name, r.domain, accountMeta(r), r.name, r.motion))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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
