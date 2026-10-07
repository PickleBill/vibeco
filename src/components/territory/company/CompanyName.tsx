import { useState, type MouseEvent, type ReactNode } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import type { TerritoryRow } from "../model";
import { cx } from "../style";
import { CompanyBrief } from "./CompanyBrief";
import { CompanyLogo, type LogoSize } from "./CompanyLogo";

/**
 * A company's logo and name as one button that opens its brief. The click
 * stops here, so a clickable row or card around it doesn't also fire.
 * `logo={false}` leaves the logo out (when it already sits beside the name).
 */
export function CompanyName({
  row,
  seller,
  logo = 20,
  sub,
  onOpen,
  className,
}: {
  row: TerritoryRow;
  seller: string;
  logo?: LogoSize | false;
  /** A small line under the name, inside the button (the domain in a table cell). */
  sub?: ReactNode;
  /** Also runs when the brief opens (e.g. to select the account in a chart). */
  onOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          title={`${row.name}: quick brief`}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onOpen?.();
          }}
          className={cx(
            "group inline-flex min-h-11 max-w-full items-center gap-2 rounded-[4px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          {logo !== false && <CompanyLogo domain={row.domain} name={row.name} size={logo} />}
          {sub ? (
            <span className="flex min-w-0 flex-col">
              <span className="underline-offset-4 group-hover:underline">{row.name}</span>
              {sub}
            </span>
          ) : (
            <span className="min-w-0 underline-offset-4 group-hover:underline">{row.name}</span>
          )}
        </button>
      </DialogTrigger>
      <CompanyBrief row={row} seller={seller} onNavigate={() => setOpen(false)} />
    </Dialog>
  );
}
