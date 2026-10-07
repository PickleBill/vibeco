import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { linkBtn } from "@/components/account/explorer/look";
import { possessive } from "../committee/model";
import { moduleHref } from "../nav";
import type { TerritoryRow } from "../model";
import { matchTraits, type Fingerprint } from "./model";

/**
 * What the seed's lookalikes are scored on, as one row of plain tags. The
 * evidence behind each trait lives in the seed's own run, one click away.
 */
export function FingerprintCard({ fp, row, seller, sellerName }: { fp: Fingerprint; row: TerritoryRow; seller: string; sellerName: string }) {
  return (
    <section aria-labelledby="fp-title" className="rounded-xl border border-border bg-white px-4 py-3 sm:px-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h2 id="fp-title" className="font-display text-lg font-semibold">
          What we match on
        </h2>
        <Link to={moduleHref(seller, "account", row.id)} className={linkBtn}>
          See {possessive(row.name)} run
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      <ul aria-label={`${row.name}'s traits`} className="mt-1 flex flex-wrap gap-1.5">
        {matchTraits(fp, sellerName).map((t) => (
          <li key={t.k} className="inline-flex min-h-[26px] items-center gap-1 rounded-[4px] border border-[#D9D4C7] bg-background px-2 py-0.5 text-[13px]">
            <span className="text-[#4A4F63]">{t.k}:</span>
            <span className="font-semibold">{t.v}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
