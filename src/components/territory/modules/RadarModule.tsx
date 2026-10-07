import { Link } from "react-router-dom";
import { fitRank } from "../model";
import { moduleHref } from "../nav";
import { Eyebrow, FieldPill, FitBadge } from "../ui";
import type { ModuleProps } from "./types";

/** 01 · Radar: the territory at a glance. (Placeholder table; the full radar replaces it.) */
export function RadarModule({ seller, territory }: ModuleProps) {
  const rows = [...territory.rows].sort((a, b) => fitRank(a.fit) - fitRank(b.fit) || (a.trigger?.ageDays ?? 9999) - (b.trigger?.ageDays ?? 9999));
  return (
    <div>
      <Eyebrow>Radar · {seller.territory?.name}</Eyebrow>
      <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem]">{rows.length} accounts in the territory</h1>
      <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-white">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="font-display text-lg font-semibold">{r.name}</span>
            <span className="font-mono text-[13px] text-muted-foreground">{r.domain}</span>
            <FieldPill>{r.motion}</FieldPill>
            <FitBadge grade={r.fit} />
            <span className="min-w-0 flex-1 text-sm text-[#4A4F63]">{r.trigger?.text ?? "No dated trigger found"}</span>
            <Link to={moduleHref(seller.id, "account", r.id)} className="text-sm font-semibold text-primary hover:underline">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
