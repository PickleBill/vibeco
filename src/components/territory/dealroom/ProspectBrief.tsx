import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { cx, primaryButton, secondaryButton } from "../style";
import { EvidenceTag, Eyebrow, SourceChip } from "../ui";
import { dateLabel, MAX_ANSWER_TEXT, tally, type Claim, type DealAnswer, type DealResponse, type Responses, type SaveState } from "./claims";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
const countWord = (n: number) => WORDS[n] ?? String(n);

export interface ProspectBriefProps {
  company: string;
  domain?: string;
  claims: Claim[];
  sources: ResearchSource[];
  responses: Responses;
  saveState?: Record<string, SaveState>;
  /** Absent in the seller's read-only preview. */
  onAnswer?: (claimId: string, answer: DealAnswer, text?: string, note?: string) => void;
  /** "Unofficial. Built from public sources. Not affiliated with …" */
  disclaimer: string;
  /** Phone layout whatever the window (the seller's phone-width preview). */
  compact?: boolean;
}

/**
 * The page the account sees at /deal/:id: "here's what we think we know about
 * you, from public sources; correct us". Claims and their sources only.
 */
export function ProspectBrief({ company, domain, claims, sources, responses, saveState = {}, onAnswer, disclaimer, compact = false }: ProspectBriefProps) {
  const t = tally(claims, responses);
  const done = t.total > 0 && t.answered === t.total;
  const wide = (base: string, more: string) => (compact ? base : `${base} ${more}`);
  const pct = t.total ? Math.round((t.answered / t.total) * 100) : 0;

  return (
    <div className="min-h-full bg-background text-foreground">
      <p className="border-b border-border bg-muted px-4 py-2.5 text-center text-sm font-semibold leading-snug">{disclaimer}</p>
      <div className={wide("mx-auto max-w-[780px] px-3 pb-10 pt-3.5", "sm:px-6 sm:pb-16 sm:pt-5")}>
        <div className="flex items-baseline justify-between gap-3 px-1">
          <span className="font-display text-lg font-bold tracking-[-0.01em]">VibeCo</span>
          <span className="text-sm text-muted-foreground">A brief you can correct</span>
        </div>

        <article aria-labelledby="deal-title" className={wide("mt-3 rounded-2xl border border-border bg-white px-4 py-5", "sm:mt-4 sm:px-8 sm:py-8")}>
          <Eyebrow>
            Prepared for {company}
            {domain ? ` · ${domain}` : ""}
          </Eyebrow>
          <h1 id="deal-title" className={wide("mt-2 font-display text-[25px] font-bold leading-[1.15] tracking-[-0.02em]", "sm:text-[34px] sm:leading-[1.12]")}>
            Here's what we think we know about {company}, from public sources. Correct us.
          </h1>
          <p className={wide("mt-3 text-base leading-relaxed text-[#4A4F63]", "sm:text-[17px]")}>
            {t.total === 1 ? "One claim, with where it came from." : `${countWord(t.total)} claims, each with where it came from.`} Mark what's right, fix what's wrong, and
            skip what you're not sure about. Nothing here is a commitment, and you can change an answer any time.
          </p>

          {t.total > 0 ? (
            <>
              <div className="mt-5 rounded-xl border border-border bg-background px-4 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-display text-xl font-semibold">
                    <span className="font-mono">{t.answered}</span> of <span className="font-mono">{t.total}</span> checked
                  </p>
                  <p className="font-mono text-[13px] text-[#4A4F63]">
                    <span className="whitespace-nowrap">✓ {t.right} right</span> · <span className="whitespace-nowrap">✎ {t.fix} fixed</span> ·{" "}
                    <span className="whitespace-nowrap">? {t.unsure} not sure</span>
                  </p>
                </div>
                <div role="progressbar" aria-label="Claims checked" aria-valuemin={0} aria-valuemax={t.total} aria-valuenow={t.answered} className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full bg-foreground transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <ol className="mt-5 flex flex-col gap-3" aria-label="Claims">
                {claims.map((c, i) => (
                  <ClaimCard key={c.id} claim={c} n={i + 1} sources={sources} response={responses[c.id]} save={saveState[c.id]} onAnswer={onAnswer} />
                ))}
              </ol>

              <div aria-live="polite">
                {done && (
                  <div className="mt-5 rounded-xl border-2 border-foreground bg-background px-4 py-4">
                    <p className="font-display text-xl font-semibold">Thank you. That's every claim.</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#4A4F63]">Your corrections go to the person who shared this link. You can still change an answer.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-xl border border-dotted border-[#9097A6] px-4 py-4 text-[15px] text-[#4A4F63]">
              We couldn't find anything specific enough to check yet. Nothing here needs an answer.
            </p>
          )}

          <p className="mt-6 border-t border-border pt-4 text-[15px] leading-relaxed text-[#4A4F63]">
            Your answers go to the person who shared this page. Every claim lists its sources, so you can check our work.
          </p>
        </article>

        <footer className="mt-4 flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-[13px] text-muted-foreground">
          <span>{disclaimer}</span>
          <span>Made with VibeCo</span>
        </footer>
      </div>
    </div>
  );
}

// ─── One claim ───

function ClaimCard({
  claim,
  n,
  sources,
  response,
  save,
  onAnswer,
}: {
  claim: Claim;
  n: number;
  sources: ResearchSource[];
  response?: DealResponse;
  save?: SaveState;
  onAnswer?: ProspectBriefProps["onAnswer"];
}) {
  const [editing, setEditing] = useState(false);
  const kind = response?.answer;
  const readOnly = !onAnswer;
  const textId = useId();

  const pick = (a: DealAnswer) => {
    if (a === "fix") return setEditing(true);
    setEditing(false);
    if (a !== kind) onAnswer?.(claim.id, a);
  };

  return (
    <li
      aria-labelledby={textId}
      className={cx("rounded-xl border bg-white p-4 transition-colors motion-reduce:transition-none", kind ? "border-foreground" : "border-border")}
    >
      <p className="font-mono text-xs font-semibold text-muted-foreground">
        {claim.num} · {claim.section}
      </p>
      <p id={textId} className={cx("mt-1.5 text-[17px] leading-snug", kind === "fix" ? "text-muted-foreground line-through" : "font-medium")}>
        {claim.text}
        {kind === "fix" && <span className="sr-only"> (you corrected this)</span>}
      </p>
      {kind === "fix" && response?.text && (
        <p className="mt-1.5 text-[17px] font-semibold leading-snug">
          <span className="text-primary" aria-hidden>
            ✎{" "}
          </span>
          <span className="sr-only">Your fix: </span>
          {response.text}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {kind === "right" ? <EvidenceTag status="Account" /> : claim.status ? <EvidenceTag status={claim.status} /> : null}
        {claim.date && (
          <span className="inline-flex h-[26px] items-center rounded-md border border-[#D9D4C7] bg-white px-2 font-mono text-xs font-medium text-foreground">{dateLabel(claim.date)}</span>
        )}
      </div>
      <SourceLinks ids={claim.sources} sources={sources} />

      <div role="group" aria-label={`Is claim ${n} right?`} className="mt-3 grid max-w-[420px] grid-cols-3 gap-2">
        <AnswerButton glyph="✓" label="Right" on={kind === "right"} readOnly={readOnly} onClick={() => pick("right")} />
        <AnswerButton glyph="✎" label="Fix" on={kind === "fix" || editing} readOnly={readOnly} onClick={() => pick("fix")} />
        <AnswerButton glyph="?" label="Not sure" on={kind === "unsure"} readOnly={readOnly} onClick={() => pick("unsure")} />
      </div>

      {editing && !readOnly && (
        <FixEditor
          claim={claim}
          initialText={kind === "fix" && response?.text ? response.text : claim.text}
          initialNote={response?.note ?? ""}
          onCancel={() => setEditing(false)}
          onSave={(text, note) => {
            setEditing(false);
            onAnswer?.(claim.id, "fix", text, note || undefined);
          }}
        />
      )}

      {!readOnly && (
        <p aria-live="polite" className="mt-2 text-sm text-[#4A4F63] empty:mt-0">
          {save === "saving" && "Saving…"}
          {save === "saved" && (
            <span className="inline-flex items-center gap-1.5">
              <Check size={14} aria-hidden className="text-[#16703F]" /> Saved
            </span>
          )}
          {save === "local" && "Saved on this device"}
        </p>
      )}
    </li>
  );
}

function AnswerButton({ glyph, label, on, readOnly, onClick }: { glyph: string; label: string; on: boolean; readOnly: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={readOnly}
      onClick={onClick}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-[15px] text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none disabled:cursor-default",
        on ? "border-primary bg-brand-tint font-bold shadow-[inset_0_0_0_1px_hsl(var(--primary))]" : "border-[#9097A6] bg-white font-medium enabled:hover:bg-muted",
      )}
    >
      <span aria-hidden className={on ? "text-primary" : "text-[#4A4F63]"}>
        {glyph}
      </span>
      {label}
    </button>
  );
}

function FixEditor({
  claim,
  initialText,
  initialNote,
  onSave,
  onCancel,
}: {
  claim: Claim;
  initialText: string;
  initialNote: string;
  onSave: (text: string, note: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [note, setNote] = useState(initialNote);
  const ref = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const clean = text.trim();
  const canSave = !!clean && clean !== claim.text;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (canSave) onSave(clean, note.trim());
  };

  return (
    <form onSubmit={submit} className="mt-3 rounded-[10px] border border-border bg-background p-3">
      <label htmlFor={`${id}-fix`} className="block text-[15px] font-semibold">
        What should it say?
      </label>
      <textarea
        ref={ref}
        id={`${id}-fix`}
        rows={3}
        maxLength={MAX_ANSWER_TEXT}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1.5 block w-full resize-y rounded-lg border border-[#9097A6] bg-white px-3 py-2.5 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <p className="mt-1 text-right font-mono text-xs text-muted-foreground" aria-hidden>
        {text.length}/{MAX_ANSWER_TEXT}
      </p>
      <label htmlFor={`${id}-note`} className="mt-1 block text-[15px] font-semibold">
        Note <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <input
        id={`${id}-note`}
        type="text"
        maxLength={MAX_ANSWER_TEXT}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1.5 block min-h-11 w-full rounded-lg border border-[#9097A6] bg-white px-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="submit" disabled={!canSave} className={primaryButton}>
          Save fix
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Each source as its numbered, ageing chip and its title, linked (titles readable without hover). */
export function SourceLinks({ ids, sources }: { ids: number[]; sources: ResearchSource[] }) {
  const byId = new Map(sources.map((s) => [Number(s.id), s]));
  const list = ids.map((id) => byId.get(id)).filter((s): s is ResearchSource => !!s);
  if (!list.length) return null;
  return (
    <ul className="mt-2 flex flex-col gap-0.5" aria-label="Sources">
      {list.map((s) => (
        <li key={s.id} className="min-w-0">
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group flex min-h-11 min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SourceChip source={{ ...s, url: "" }} n={Number(s.id)} />
            <span className="min-w-0 truncate text-sm text-[#4A4F63] group-hover:text-foreground group-hover:underline">{s.title}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
