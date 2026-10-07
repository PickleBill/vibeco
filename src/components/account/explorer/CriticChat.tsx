import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, RotateCcw, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { cx } from "@/components/territory/style";
import { Eyebrow } from "@/components/territory/ui";
import { criticFor } from "@/lib/lenses";
import { Cited, type AccountBrief } from "../AccountViews";
import { linkBtn, primaryBtn, toggle } from "./look";
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

// Grades read by dot count and border, not color: ●●● ink fill, ●●○ solid ring, ●○○ dotted ring.
const VERDICT: Record<NonNullable<ChatTurn["verdict"]>, { label: string; dots: string; cls: string }> = {
  strong: { label: "Strong", dots: "●●●", cls: "bg-foreground text-white" },
  partial: { label: "Partial", dots: "●●○", cls: "border-2 border-foreground bg-card text-foreground" },
  misses: { label: "Misses", dots: "●○○", cls: "border-2 border-dotted border-foreground bg-card text-foreground" },
};

function Grade({ verdict }: { verdict: NonNullable<ChatTurn["verdict"]> }) {
  const v = VERDICT[verdict];
  return (
    <span className={cx("inline-flex min-w-[92px] shrink-0 flex-col items-center rounded-[10px] px-2.5 py-1.5", v.cls)} title={`Graded ${v.label}`}>
      <span className="font-mono text-[15px] leading-tight tracking-[2px]" aria-hidden>
        {v.dots}
      </span>
      <span className="font-display text-[15px] font-bold leading-tight">{v.label}</span>
    </span>
  );
}

/** The critic's seat, as a round token with its icon. */
const Seat = ({ icon: Icon, dashed }: { icon: LucideIcon; dashed?: boolean }) => (
  <span
    className={cx(
      "flex h-8 w-8 shrink-0 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-foreground bg-card text-foreground",
      dashed && "border-dashed",
    )}
    aria-hidden
  >
    <Icon size={17} />
  </span>
);

// One warm-up call per page, so the first real reply doesn't wait on a cold start.
let warmed = false;
function warmUp() {
  if (warmed) return;
  warmed = true;
  supabase.functions.invoke("critic-chat", { body: { ping: true } }).catch(() => undefined);
}

/**
 * Take a seat: the seller replies to a seat's question, and the critic
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
  const name = meta?.name ?? "critic";
  const style = SEAT_STYLE[seat] ?? SEAT_STYLE.builder;
  const questions = (critic.challenge_questions ?? []).map((q) => q.question).filter(Boolean);
  const [question, setQuestion] = useState(0);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const exchanges = turns.filter((t) => t.role === "seller").length;
  const done = exchanges >= MAX_EXCHANGES;
  const lastFollowUp = [...turns].reverse().find((t) => t.role === "critic")?.follow_up;
  const opening = questions[question];

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
      setError(ctrl.signal.aborted ? `The ${name} took too long to answer.` : `The ${name} didn't answer.`);
    } finally {
      window.clearTimeout(timer);
      setPending(false);
    }
  };

  return (
    <section aria-label={`Answer the ${name}`} className="mt-6 rounded-xl border border-foreground bg-background p-3.5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <Eyebrow>Take a seat</Eyebrow>
          <h4 className="mt-1 font-display text-[22px] font-semibold tracking-[-0.01em] text-foreground">Answer the {name}</h4>
        </div>
        <span className="font-mono text-xs text-muted-foreground">synthetic critic · {Math.min(exchanges, MAX_EXCHANGES)} of {MAX_EXCHANGES} answers</span>
      </div>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-[#4A4F63]">
        Reply as the seller. The {name} answers from the brief and its sources only, grades your answer on three dots, and pushes back.
      </p>

      {!turns.length && questions.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Which question you're answering">
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
              className={toggle(question === i)}
            >
              Answer question {i + 1}
            </button>
          ))}
        </div>
      )}

      <ol className="mt-4 space-y-3" aria-label="Conversation">
        {opening && (
          <li className="flex items-start gap-2.5">
            <Seat icon={style.icon} dashed />
            <div className="min-w-0 flex-1 rounded-[4px_14px_14px_14px] border border-border bg-card px-3.5 py-3 sm:max-w-[92%] sm:flex-none sm:px-4">
              <p className="text-sm font-bold text-foreground">
                {name} <span className="font-mono text-xs font-normal text-muted-foreground">asks · synthetic</span>
              </p>
              <p className="mt-0.5 font-display text-base font-semibold leading-snug text-foreground sm:text-lg">
                &ldquo;
                <Cited text={opening} sources={sources} />
                &rdquo;
              </p>
            </div>
          </li>
        )}
        <AnimatePresence initial={false}>
          {turns.map((t, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={t.role === "seller" ? "flex justify-end" : "flex items-start gap-2.5"}
            >
              {t.role === "seller" ? (
                <div className="max-w-[90%] sm:max-w-[85%] rounded-[14px_4px_14px_14px] bg-foreground px-4 py-2.5 text-white">
                  <p className="font-mono text-xs text-white/70">You · seller</p>
                  <p className="mt-0.5 whitespace-pre-line text-[15px] leading-snug">{t.content}</p>
                </div>
              ) : (
                <>
                  <Seat icon={style.icon} />
                  <div className="min-w-0 flex-1 rounded-[4px_14px_14px_14px] border border-border bg-card px-3.5 py-3 sm:max-w-[92%] sm:px-4">
                    <p className="text-sm font-bold text-foreground">
                      {name} <span className="font-mono text-xs font-normal text-muted-foreground">synthetic</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-start gap-3">
                      {t.verdict && VERDICT[t.verdict] && <Grade verdict={t.verdict} />}
                      <p className="min-w-[200px] flex-1 text-[15px] leading-relaxed text-foreground">
                        <Cited text={t.content} sources={sources} />
                      </p>
                    </div>
                    {t.follow_up && (
                      <p className="mt-3 border-t border-border pt-2.5 font-display text-base font-semibold leading-snug text-foreground">
                        <Cited text={t.follow_up} sources={sources} />
                      </p>
                    )}
                  </div>
                </>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {pending && (
          <li className="flex items-center gap-2.5 text-[15px] text-[#4A4F63]">
            <Seat icon={style.icon} dashed />
            <span className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin text-foreground" aria-hidden /> The {name} is reading your answer…
            </span>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border-2 border-foreground bg-card px-4 py-2.5 text-[15px] text-foreground">
          <span className="font-semibold">{error}</span>
          <button type="button" onClick={() => send(text)} className={linkBtn}>
            <RotateCcw size={14} aria-hidden /> Try again
          </button>
        </div>
      )}

      {done ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 text-[15px] text-[#4A4F63]">
          That&rsquo;s the round. Try another seat, or
          <button type="button" onClick={() => onTurns([])} className={linkBtn}>
            start over
          </button>
        </p>
      ) : (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor={`chat-${seat}`} className="text-[15px] font-bold text-foreground">
            Your answer
          </label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-end">
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
              className="min-h-[3.5rem] flex-1 resize-y rounded-[8px] border border-[#9097A6] bg-card px-3 py-2.5 text-base leading-snug text-foreground placeholder:text-[#6B7080] focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="submit" disabled={pending || !text.trim()} className={cx(primaryBtn, "sm:min-h-[3.5rem]")}>
              {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <ArrowUp size={16} aria-hidden />}
              Send
            </button>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter sends · Shift+Enter for a new line</p>
        </form>
      )}
      <p className="mt-3 text-sm text-muted-foreground">Synthetic critic. Nothing here is sent to anyone.</p>
    </section>
  );
}
