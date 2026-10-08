import { useEffect, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { linkBtn, toggle } from "@/components/account/explorer/look";
import { cx } from "../style";
import { casesFrom, count, CUSTOM_DEFAULT, money, priceCase, SHAPES, type CaseInputs, type CaseResult, type PartnerRiff, type RiffPricing } from "./model";

type Key = keyof CaseInputs;

interface Row {
  key: Key;
  label: string;
  unit: "accounts" | "%" | "$" | "seats";
  note?: string;
  shapes?: RiffPricing[];
}

/**
 * Price to value, in code: the riff's assumptions as a low case and a high
 * case, every one editable, the new tier's revenue, the seller's fee and what
 * the company keeps recalculated as you type. The formula is shown, never hidden.
 */
export function PriceModel({ riff, seller, onChange }: { riff: PartnerRiff; seller: string; onChange?: (shape: RiffPricing, cases: { low: CaseResult; high: CaseResult }) => void }) {
  const notes = riff.gtm.notes;
  const rows: Row[] = [
    { key: "endCustomers", label: "Customer accounts who could get it", unit: "accounts", note: notes.end_customers },
    { key: "adoptionPct", label: "Share who pay for the tier", unit: "%", note: notes.premium_adoption_pct },
    { key: "pricePerMonth", label: "Tier price, per account a month", unit: "$", note: notes.premium_price_per_customer_month },
    { key: "seats", label: "Seats per account", unit: "seats", note: notes.seats_per_customer, shapes: ["platform_plus_per_seat"] },
    { key: "platformFee", label: `${seller} platform fee, a year`, unit: "$", shapes: ["platform_plus_per_customer", "platform_plus_per_seat"] },
    { key: "perCustomerYear", label: `${seller} fee per paying account, a year`, unit: "$", shapes: ["platform_plus_per_customer"] },
    { key: "perSeatYear", label: `${seller} fee per seat, a year`, unit: "$", shapes: ["platform_plus_per_seat"] },
    { key: "customYear", label: `${seller} annual fee, negotiated`, unit: "$", shapes: ["custom"] },
  ];
  const initial = useMemo(() => casesFrom(riff.gtm.assumptions, CUSTOM_DEFAULT), [riff]);
  const [shape, setShape] = useState<RiffPricing>(riff.gtm.pricing_shape);
  // Strings while typing, so a field can be emptied; numbers for the math.
  const [low, setLow] = useState<Record<Key, string>>(() => asText(initial.low));
  const [high, setHigh] = useState<Record<Key, string>>(() => asText(initial.high));
  useEffect(() => {
    setShape(riff.gtm.pricing_shape);
    setLow(asText(initial.low));
    setHigh(asText(initial.high));
  }, [riff, initial]);

  const lowCase = priceCase(asNumbers(low), shape);
  const highCase = priceCase(asNumbers(high), shape);
  useEffect(() => {
    onChange?.(shape, { low: lowCase, high: highCase });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report the numbers, not the callback's identity
  }, [shape, lowCase.tierArr, lowCase.omniArr, highCase.tierArr, highCase.omniArr]);

  const shown = rows.filter((r) => !r.shapes || r.shapes.includes(shape));
  const reset = () => {
    setShape(riff.gtm.pricing_shape);
    setLow(asText(initial.low));
    setHigh(asText(initial.high));
  };
  const formula = SHAPES.find((s) => s.id === shape)?.formula ?? "";

  return (
    <div>
      <div role="radiogroup" aria-label="Pricing shape" className="flex flex-wrap gap-2">
        {SHAPES.map((s) => (
          <button key={s.id} type="button" role="radio" aria-checked={shape === s.id} onClick={() => setShape(s.id)} className={toggle(shape === s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* A table from a tablet up; on a phone each assumption is its label over its two cases. */}
      <div className="mt-4">
        <table className="block w-full border-collapse text-left text-[15px] sm:table">
          <caption className="sr-only">Assumptions, low case and high case</caption>
          <thead className="block sm:table-header-group">
            <tr className="grid grid-cols-2 gap-x-2 border-b border-border text-sm text-[#4A4F63] sm:table-row">
              <th scope="col" className="hidden py-2 pr-3 font-semibold sm:table-cell">
                Assumption
              </th>
              <th scope="col" className="px-1 py-2 font-semibold sm:w-[118px]">
                Low case
              </th>
              <th scope="col" className="px-1 py-2 font-semibold sm:w-[118px]">
                High case
              </th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {shown.map((r) => (
              <tr key={r.key} className="grid grid-cols-2 gap-x-2 border-b border-[#ECE8DE] pb-1.5 align-top sm:table-row sm:pb-0">
                <th scope="row" className="col-span-2 py-2 pr-3 font-medium sm:table-cell">
                  {r.label}
                  {r.note && <span className="mt-0.5 block text-[13px] font-normal leading-snug text-[#4A4F63]">{r.note}</span>}
                </th>
                {(["low", "high"] as const).map((side) => (
                  <td key={side} className="px-1 py-1.5">
                    <NumberField
                      label={`${r.label}, ${side} case`}
                      unit={r.unit}
                      value={(side === "low" ? low : high)[r.key]}
                      onChange={(v) => (side === "low" ? setLow : setHigh)((m) => ({ ...m, [r.key]: v }))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-live="polite" className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <Outcome label="Paying accounts" low={count(lowCase.paying)} high={count(highCase.paying)} />
        <Outcome label="Their new tier, a year" low={money(lowCase.tierArr)} high={money(highCase.tierArr)} strong />
        <Outcome label={`${seller}, a year`} low={money(lowCase.omniArr)} high={money(highCase.omniArr)} strong />
      </div>
      <p className="mt-2.5 text-[15px] text-[#4A4F63]">
        They keep <b className="text-foreground">{money(lowCase.keep)}</b> to <b className="text-foreground">{money(highCase.keep)}</b> a year after {seller}
        {lowCase.keep < 0 ? (
          <>; in the low case the tier earns less than {seller}&rsquo;s fee</>
        ) : (
          highCase.tierArr > 0 && (
            <>
              {" "}
              ({seller} is {Math.round(lowCase.take * 100)}% to {Math.round(highCase.take * 100)}% of the tier)
            </>
          )
        )}
        .
      </p>
      <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-[13px] leading-relaxed text-[#4A4F63]">
        tier = accounts × share × price × 12 · {seller} = {formula}
      </p>
      <button type="button" onClick={reset} className={cx(linkBtn, "mt-2 text-[#4A4F63] hover:text-foreground")}>
        <RotateCcw size={14} aria-hidden /> Back to the riff&rsquo;s numbers
      </button>
    </div>
  );
}

function asText(c: CaseInputs): Record<Key, string> {
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, String(v)])) as Record<Key, string>;
}

function asNumbers(t: Record<Key, string>): CaseInputs {
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Number(String(v).replace(/[,$%\s]/g, "")) || 0])) as unknown as CaseInputs;
}

function NumberField({ label, unit, value, onChange }: { label: string; unit: Row["unit"]; value: string; onChange: (v: string) => void }) {
  return (
    <span className="flex h-10 items-center overflow-hidden rounded-[8px] border border-[#9097A6] bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-ring">
      {unit === "$" && <span className="pl-2.5 text-[#4A4F63]">$</span>}
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        autoComplete="off"
        data-1p-ignore=""
        data-lpignore="true"
        data-form-type="other"
        className="h-full w-full min-w-0 bg-transparent px-2 font-mono text-[15px] tabular-nums text-foreground focus:outline-none"
      />
      {unit === "%" && <span className="pr-2.5 text-[#4A4F63]">%</span>}
    </span>
  );
}

function Outcome({ label, low, high, strong }: { label: string; low: string; high: string; strong?: boolean }) {
  return (
    <div className={cx("rounded-[10px] border px-3 py-2.5", strong ? "border-foreground bg-white" : "border-border bg-white")}>
      <p className="text-[13px] font-semibold text-[#4A4F63]">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
        {low} <span className="text-[15px] font-normal text-[#4A4F63]">to</span> {high}
      </p>
    </div>
  );
}

