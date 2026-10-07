import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TerritoryRow } from "./model";
import { cx } from "./style";

/** Pick a territory account for a view that works on one account (committee, deal room). */
export function AccountSwitcher({
  rows,
  activeId,
  hrefFor,
  loading,
  label = "Account",
}: {
  rows: TerritoryRow[];
  activeId?: string;
  hrefFor: (id: string) => string;
  loading?: boolean;
  label?: string;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      <span className="font-mono text-[13px] text-muted-foreground">{label}</span>
      {rows.map((r) => {
        const on = r.id === activeId;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => navigate(hrefFor(r.id))}
            className={cx(
              "inline-flex min-h-9 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              on ? "border-primary bg-brand-tint font-bold text-foreground" : "border-border bg-white font-medium text-[#4A4F63] hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {r.name}
          </button>
        );
      })}
      {loading && <Loader2 size={16} className="animate-spin text-muted-foreground" aria-label="Loading accounts" />}
    </div>
  );
}
