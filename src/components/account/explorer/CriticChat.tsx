import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, MessagesSquare, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { criticFor } from "@/lib/lenses";
import { Cited, type AccountBrief } from "../AccountViews";
import type { CriticResult } from "./model";
import { SEAT_STYLE } from "./seatStyle";

export interface ChatTurn {
  role: "seller" | "critic";
  content: string;
  verdict?: "strong" | "partial" | "misses";
  follow_up?: string;
}

const MAX_EXCHANGES = 3;
const TIMEOUT_MS = 20_000;

const VERDICT: Record<NonNullable<ChatTurn["verdict"]>, { label: string; cls: string }> = {
  strong: { label: "Strong answer", cls: "border-emerald-600/40 bg-emerald-50 text-emerald-800" },
  partial: { label: "Partial", cls: "border-amber-500/50 bg-amber-50 text-amber-800" },
  misses: { label: "Misses", cls: "border-rose-500/40 bg-rose-50 text-rose-800" },
};

// One warm-up call per page, so the first real reply doesn't wait on a cold start.
let warmed = false;
function warmUp() {
  if (warmed) return;
  warmed = true;
  supabase.functions.invoke("critic-chat", { body: { ping: true } }).catch(() => undefined);
}

/**
 * Answer the critic: the seller replies to a seat's question, and the critic
 * answers in character from the brief and its sources only, grades the reply
 * and pushes back once. Three exchanges per seat.
 */
export function CriticChat({
  brief,
  critic,
  sources,
  turns,
  onTurns,
}: {
  brief: AccountBrief;
  critic: CriticResult;
  sources: ResearchSource[];
  turns: ChatTurn[];
  onTurns: (turns: ChatTurn[]) => void;
}) {
  const seat = critic.persona;
  const meta = criticFor("account", seat);
  const style = SEAT_STYLE[seat] ?? SEAT_STYLE.builder;
  const Icon = style.icon;
  const questions = (critic.challenge_questions ?? []).map((q) => q.question).filter(Boolean);
  const [question, setQuestion] = useState(0);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const exchanges = turns.filter((t) => t.role === "seller").length;
  const done = exchanges >= MAX_EXCHANGES;
  const lastFollowUp = [...turns].reverse().find((t) => t.role === "critic")?.follow_up;

  useEffect(warmUp, []);

  const send = async (message: string) => {
    const reply = message.trim();
    if (!reply || pending || done) return;
    setPending(true);
    setError(null);
    const history = turns.map(({ role, content }) => ({ role, content }));
    const withMine: ChatTurn[] = [...turns, { role: "seller", content: reply }];
    onTurns(withMine);
    setText("");
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const { data, error: err } = await supabase.functions.invoke("critic-chat", {
        body: {
          brief,
          seat,
          message: reply,
          question: turns.length ? lastFollowUp : questions[question],
          critic: { headline: critic.headline ?? "", perspective: critic.perspective ?? "" },
          history,
        },
        signal: ctrl.signal,
      });
      if (err || !data || (data as { error?: string }).error || !(data as { reply?: string }).reply) throw err ?? new Error((data as { error?: string })?.error);
      const d = data as { reply: string; verdict: ChatTurn["verdict"]; follow_up?: string };
      onTurns([...withMine, { role: "critic", content: d.reply, verdict: d.verdict, follow_up: d.follow_up || undefined }]);
    } catch {
      // Put the reply back so nothing typed is lost.
      onTurns(turns);
      setText(reply);
      setError(ctrl.signal.aborted ? `The ${meta?.name ?? "critic"} took too long to answer.` : `The ${meta?.name ?? "critic"} didn't answer.`);
    } finally {
      window.clearTimeout(timer);
      setPending(false);
    }
  };

  return (
    <section aria-label={`Answer the ${meta?.name ?? "critic"}`} className="mt-4 rounded-lg border border-primary/25 bg-card p-4 sm:p-5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        <MessagesSquare size={14} aria-hidden /> Answer them
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Reply as the seller to {questions.length > 1 ? "one of the questions above" : "the question above"}. The {meta?.name ?? "critic"} answers from the brief and its sources only, grades your answer, and pushes back.
      </p>

      {!turns.length && questions.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Which question you're answering">
          {questions.map((q, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={question === i}
              onClick={() => {
                setQuestion(i);
                inputRef.current?.focus();
              }}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                question === i ? "border-primary/50 bg-accent text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              Answer question {i + 1}
            </button>
          ))}
        </div>
      )}

      <ol className="mt-3 space-y-3">
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={t.role === "seller" ? "flex justify-end" : "flex"}>
              {t.role === "seller" ? (
                <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-[15px] leading-snug text-primary-foreground">{t.content}</p>
              ) : (
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-border bg-surface-elevated px-3.5 py-2.5">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                    <Icon size={13} className={style.color} aria-hidden /> {meta?.name}
                    {t.verdict && <span className={`rounded-full border px-2 py-px text-xs font-semibold ${VERDICT[t.verdict].cls}`}>{VERDICT[t.verdict].label}</span>}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-foreground/90">
                    <Cited text={t.content} sources={sources} />
                  </p>
                  {t.follow_up && (
                    <p className="mt-1.5 text-[15px] font-medium leading-snug text-foreground">
                      <Cited text={t.follow_up} sources={sources} />
                    </p>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {pending && (
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin text-primary" aria-hidden /> The {meta?.name} is reading your answer…
          </li>
        )}
      </ol>

      {error && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-destructive">
          {error}
          <button type="button" onClick={() => send(text)} className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
            <RotateCcw size={13} aria-hidden /> Try again
          </button>
        </p>
      )}

      {done ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          That&rsquo;s the round. Try another seat, or
          <button type="button" onClick={() => onTurns([])} className="font-medium text-primary underline-offset-4 hover:underline">
            start over
          </button>
        </p>
      ) : (
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor={`chat-${seat}`} className="sr-only">
            Your answer
          </label>
          <textarea
            id={`chat-${seat}`}
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={2}
            maxLength={600}
            placeholder={turns.length ? "Answer the follow-up…" : "Your answer, as the seller…"}
            className="min-h-[3rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
          >
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ArrowUp size={17} aria-hidden />}
          </button>
        </form>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Synthetic critic. Nothing here is sent to anyone.</p>
    </section>
  );
}
