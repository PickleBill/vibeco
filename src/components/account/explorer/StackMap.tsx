import { useState } from "react";
import { Quote } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import type { StackFeature } from "@/lib/lenses";
import { Cited, StatusTag, type MotionRead } from "../AccountViews";

const COLUMNS = ["Warehouse", "Transformation", "BI tools", "AI", "Embedded analytics"] as const;

const CHIP: Record<string, string> = {
  Confirmed: "border-emerald-600/40 bg-emerald-50 text-emerald-900",
  Inferred: "border-dashed border-amber-500/60 bg-amber-50/50 text-amber-900",
  Former: "border-border bg-muted/50 text-muted-foreground line-through decoration-1",
  Signal: "border-dashed border-primary/50 bg-accent/50 text-primary",
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
 * The stack as five columns. Confirmed tools are solid, Inferred dashed,
 * Former struck through; an empty column says Not found. The Embedded column
 * also shows signals of analytics inside the product. Tap a chip for the
 * sentence behind it.
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {columns.map((col) => (
          <div key={col.name} className="rounded-lg border border-border bg-surface-elevated p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{col.name}</p>
            {col.items.length ? (
              <ul className="mt-2 flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
                {col.items.map((it) => (
                  <li key={it.key}>
                    <button
                      type="button"
                      onClick={() => setPicked((p) => (p === it.key ? null : it.key))}
                      aria-pressed={picked === it.key}
                      title={it.detail}
                      className={`rounded-md border px-2 py-1 text-left text-sm font-medium transition-shadow hover:shadow-sm ${CHIP[it.status] ?? CHIP.Inferred} ${
                        picked === it.key ? "ring-2 ring-primary/30" : ""
                      }`}
                    >
                      {it.status === "Signal" && <span className="mr-1 text-xs font-semibold uppercase tracking-wide">Signal</span>}
                      {it.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 rounded-md border border-dashed border-border px-2 py-1 text-sm italic text-muted-foreground/80">Not found</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        {(["Confirmed", "Inferred", "Former"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <StatusTag status={s} />
          </span>
        ))}
        <span>Tap a tool for the sentence behind it.</span>
      </div>
      {chosen && (
        <div className="mt-3 rounded-lg border border-primary/25 bg-accent/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
            {chosen.label}
            {chosen.status !== "Signal" ? <StatusTag status={chosen.status} /> : <span className="text-xs uppercase tracking-wide text-primary">Signal of analytics in its product</span>}
            {chosen.sources.length > 0 && <Cited text={`[${chosen.sources.join(", ")}]`} sources={sources} />}
          </p>
          {chosen.detail && (
            <p className="mt-1.5 flex gap-1.5 leading-relaxed text-foreground/85">
              {chosen.quoted && <Quote size={13} className="mt-1 shrink-0 text-primary/60" aria-hidden />}
              <span className={chosen.quoted ? "italic" : ""}>
                <Cited text={chosen.detail} sources={sources} />
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
