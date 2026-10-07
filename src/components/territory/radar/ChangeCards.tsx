import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { moduleHref } from "../nav";
import { ageText, cx, primaryButton, secondaryButton } from "../style";
import { EvidenceTag, FieldPill, FitBadge } from "../ui";
import { changeHeadline, type RunChange } from "./diff";
import { agoText, dayLabel } from "./evidence";
import type { RadarAccount } from "./model";
import { Chips, FreshPill } from "./pieces";

const isStatus = (v?: string) => !!v && ["Confirmed", "Inferred", "Former", "Not found"].includes(v);

/** "− before / + after", only for a real diff between two runs. */
function DiffBlock({ changes, account }: { changes: RunChange[]; account: RadarAccount }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border font-mono text-sm">
      {changes.map((c, i) => (
        <div key={`${c.field}-${i}`} className={cx(i > 0 && "border-t border-border")}>
          {c.kind !== "trigger" && (
            <div className="flex flex-wrap items-center gap-2.5 bg-muted px-3 py-2 text-[#4A4F63]">
              <span aria-label="before" className="w-3 font-semibold">
                −
              </span>
              <span className="min-w-0 flex-[1_1_160px]">{c.field}</span>
              {isStatus(c.before) ? <EvidenceTag status={c.before} className="font-sans" /> : <span className="font-semibold">{c.before}</span>}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2.5 border-t border-[#FFD0E6] bg-brand-tint px-3 py-2 text-foreground first:border-t-0">
            <span aria-label="after" className="w-3 font-bold text-primary">
              +
            </span>
            <span className="min-w-0 flex-[1_1_160px] font-semibold">{c.kind === "trigger" ? c.after : c.field}</span>
            {c.kind !== "trigger" && (isStatus(c.after) ? <EvidenceTag status={c.after} className="font-sans" /> : <span className="font-semibold">{c.after}</span>)}
            <Chips ids={c.sources} sources={account.sources} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** One account that moved: what happened, why it matters, the one question, where to go next. */
export function ChangeCard({ account, seller, onFocus }: { account: RadarAccount; seller: string; onFocus: (id: string) => void }) {
  const { row, trigger, changes } = account;
  const headline = changes.length ? changeHeadline(changes.find((c) => c.kind === "trigger") ?? changes[0]) : trigger?.text;
  return (
    <article aria-labelledby={`card-${row.id}`} className="flex flex-col gap-3.5 rounded-xl border border-border bg-white p-4 sm:px-5 sm:py-[18px]">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`card-${row.id}`} className="mr-0.5 font-display text-xl font-semibold tracking-[-0.01em]">
          {row.name}
        </h3>
        {row.domain && <span className="font-mono text-[13px] text-muted-foreground">{row.domain}</span>}
        <FieldPill>{row.motion}</FieldPill>
        <FitBadge grade={row.fit} />
        {changes.length > 0 ? <FreshPill>Changed since last run</FreshPill> : trigger && <FreshPill>Fresh trigger · {ageText(trigger.days)}</FreshPill>}
        <button
          type="button"
          onClick={() => onFocus(row.id)}
          className="ml-auto inline-flex min-h-11 items-center rounded-md px-1 text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Quick look<span className="sr-only"> at {row.name}</span>
        </button>
      </div>

      {headline && (
        <div className="flex flex-col gap-1.5">
          <p className="text-lg font-bold leading-snug">{headline}</p>
          {trigger && !changes.length && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-[#4A4F63]">
              <span className="font-mono">
                {dayLabel(trigger.date)} · {agoText(trigger.days)}
              </span>
              <Chips ids={trigger.sources} sources={account.sources} />
            </p>
          )}
        </div>
      )}

      {changes.length > 0 && <DiffBlock changes={changes} account={account} />}

      {account.why && (
        <div>
          <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Why it matters</p>
          <p className="text-base text-foreground">{account.why}</p>
          <Chips ids={account.fitSources} sources={account.sources} className="mt-2" />
        </div>
      )}

      {account.question && (
        <div className="rounded-lg border border-border bg-background px-3.5 py-3">
          <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.04em] text-muted-foreground">The one question to ask</p>
          <p className="font-display text-[17px] font-semibold leading-snug">&ldquo;{account.question}&rdquo;</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Link to={moduleHref(seller, "account", row.id)} className={cx(primaryButton, "text-[15px]")}>
          Open account
        </Link>
        <Link to={moduleHref(seller, "committee", row.id)} className={cx(secondaryButton, "text-[15px]")}>
          Committee
        </Link>
        <Link to={moduleHref(seller, "deal", row.id)} className={cx(secondaryButton, "text-[15px]")}>
          Deal Room
        </Link>
      </div>
    </article>
  );
}

/**
 * "What's fresh": a card for every account with a trigger in the last 60
 * days or a change since its last run. When nothing qualifies, a calm note
 * and the three freshest accounts anyway.
 */
export function FreshList({ accounts, seller, onFocus }: { accounts: RadarAccount[]; seller: string; onFocus: (id: string) => void }) {
  const fresh = accounts.filter((a) => a.fresh);
  if (fresh.length) {
    return (
      <section aria-label="What's fresh" className="flex min-w-0 flex-col gap-4">
        {fresh.map((a) => (
          <ChangeCard key={a.row.id} account={a} seller={seller} onFocus={onFocus} />
        ))}
      </section>
    );
  }
  const top = accounts.slice(0, 3);
  return (
    <section aria-label="What's fresh" className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-white p-5 sm:p-6">
      <div>
        <h3 className="font-display text-2xl font-semibold">Nothing moved in the last 60 days</h3>
        <p className="mt-1.5 text-base text-[#4A4F63]">
          No account has a dated trigger this recent{accounts.some((a) => a.row.previousId) ? ", and no re-run changed anything a source backs" : ""}. A quiet territory is a good time to re-check
          old evidence. The freshest three:
        </p>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {top.map((a) => (
          <li key={a.row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
            <button type="button" onClick={() => onFocus(a.row.id)} className="min-h-11 text-left font-display text-[17px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {a.row.name}
            </button>
            <span className="min-w-0 flex-1 text-[15px] text-[#4A4F63]">{a.trigger ? `${a.trigger.text} · ${dayLabel(a.trigger.date)}` : "No dated trigger found"}</span>
            <Link to={moduleHref(seller, "account", a.row.id)} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Open <ArrowRight size={14} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
