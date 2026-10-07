import { useState } from "react";
import { Quote } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import type { StackFeature } from "@/lib/lenses";
import { cx } from "@/components/territory/style";
import { EvidenceTag } from "@/components/territory/ui";
import { Cited, StatusTag, type MotionRead } from "../AccountViews";

const COLUMNS = ["Warehouse", "Transformation", "BI tools", "AI", "Embedded analytics"] as const;

// Tool chips wear their evidence tag's shape: Confirmed solid, Inferred dashed amber, Former struck.
const CHIP: Record<string, string> = {
  Confirmed: "border-[#16703F] bg-[#16703F] text-white",
  Inferred: "border-dashed border-[#B45309] bg-[#FFF4E0] text-foreground",
  Former: "border-[#9097A6] bg-white text-[#5C6175] line-through",
  Signal: "border-dashed border-foreground bg-white text-foreground",
};

/** "Databricks (Lakehouse, Delta Lake)" and "Databricks" name the same product. */
const toolName = (t: string) => t.replace(/\(.*?\)/g, "").replace(/^(?:amazon|aws|google|microsoft|apache)\s+/i, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const sameTool = (a: string, b: string) => !!toolName(a) && toolName(a) === toolName(b);

interface Item {
  key: string;
  label: string;
  status: string;
  sources: number[];
  detail?: string;
  /** A quote from the source (Confirmed, Former, signals). */
  quoted: boolean;
}

/**
 * The stack as a five-column grid (rows on narrow screens). Confirmed tools
 * are solid, Inferred dashed, Former struck through; an empty column says Not
 * found. The Embedded column also shows signals of analytics inside the
 * product. Tap a chip for the sentence behind it.
 */
export function StackMap({ lines, motion, sources }: { lines?: StackFeature[]; motion?: MotionRead; sources: ResearchSource[] }) {
  const [picked, setPicked] = useState<string | null>(null);
  const all = Array.isArray(lines) ? lines : [];
  const columns = COLUMNS.map((name) => {
    const items: Item[] = [];
    for (const l of all.filter((x) => x.name === name && x.status !== "Not found" && x.tool)) {
      const status = l.status ?? "Inferred";
      const sources = Array.isArray(l.sources) ? l.sources : [];
      // One chip per product: "Databricks (Lakehouse, Delta Lake)" and "Databricks" with the same tag merge.
      const twin = items.find((it) => it.status === status && sameTool(it.label, l.tool ?? ""));
      if (twin) {
        twin.sources = [...new Set([...twin.sources, ...sources])].sort((a, b) => a - b);
        continue;
      }
      items.push({ key: `${name}-${items.length}`, label: l.tool ?? "", status, sources, detail: l.evidence || l.description, quoted: !!l.evidence });
    }
    if (name === "Embedded analytics") {
      const seen = new Set<string>();
      for (const e of motion?.embedded?.evidence ?? []) {
        const k = e.signal.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        items.push({ key: `signal-${k}`, label: e.signal, status: "Signal", sources: [e.source], detail: e.quote, quoted: e.quote !== e.signal });
      }
    }
    return { name, items };
  });
  const chosen = columns.flatMap((c) => c.items).find((i) => i.key === picked);
  if (!all.length) return null;
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="grid divide-y divide-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {columns.map((col) => (
            <div key={col.name} className="flex flex-row lg:flex-col">
              <p className="bg-muted px-3 font-mono text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground w-36 shrink-0 py-3 sm:w-44 lg:min-h-[3.4rem] lg:w-auto lg:border-b lg:border-border lg:py-2.5">
                {col.name}
              </p>
              <div className="flex min-w-0 flex-1 flex-wrap content-start items-start gap-2 p-3 lg:flex-col">
                {col.items.length ? (
                  col.items.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      data-stack-chip
                      onClick={() => setPicked((p) => (p === it.key ? null : it.key))}
                      aria-pressed={picked === it.key}
                      title={it.detail}
                      className={cx(
                        "inline-flex min-h-11 max-w-full rounded-[6px] border px-2.5 text-left text-sm font-semibold leading-snug transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-[34px] lg:py-1",
                        it.status === "Signal" ? "flex-col items-start justify-center py-1" : "items-center",
                        CHIP[it.status] ?? CHIP.Inferred,
                        picked === it.key && "ring-2 ring-ring ring-offset-2",
                      )}
                    >
                      {it.status === "Signal" && <span className="font-mono text-xs font-medium uppercase tracking-[0.04em] text-muted-foreground">Signal </span>}
                      {it.label}
                    </button>
                  ))
                ) : (
                  <EvidenceTag status="Not found" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-[#4A4F63]">
        {(["Confirmed", "Inferred", "Former"] as const).map((s) => (
          <StatusTag key={s} status={s} />
        ))}
        <span className="mr-1 inline-flex h-[26px] items-center rounded-[6px] border border-dashed border-foreground px-2 font-mono text-xs font-medium uppercase text-muted-foreground">
          Signal
        </span>
        <span>Tap a tool for the sentence behind it.</span>
      </div>
      <div aria-live="polite">
        {chosen && (
          <div className="mt-3 rounded-xl border border-foreground bg-card p-4">
            <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
              {chosen.label}
              {chosen.status !== "Signal" ? (
                <StatusTag status={chosen.status} />
              ) : (
                <span className="text-sm font-medium text-[#4A4F63]">Signal of analytics in its product</span>
              )}
              {chosen.sources.length > 0 && <Cited text={`[${chosen.sources.join(", ")}]`} sources={sources} />}
            </p>
            {chosen.detail && (
              <p className="mt-2 flex gap-2 text-[15px] leading-relaxed text-foreground">
                {chosen.quoted && <Quote size={14} className="mt-1 shrink-0 text-muted-foreground" aria-hidden />}
                <span className={chosen.quoted ? "italic" : ""}>
                  <Cited text={chosen.detail} sources={sources} />
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
