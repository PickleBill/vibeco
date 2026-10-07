import { useState } from "react";
import type { AccountBrief } from "@/components/account/AccountViews";
import type { ResearchSource } from "@/components/simulator/SourcesList";
import { CriticChat, type ChatTurn } from "@/components/account/explorer/CriticChat";
import { stripMarks, type CriticResult } from "@/components/account/explorer/model";
import { criticFor } from "@/lib/lenses";
import { cx } from "../style";
import { SEAT_IDS, type SeatId } from "./model";
import { CitedLine, SeatToken } from "./parts";

/**
 * Take a seat: step into the meeting and answer one critic. The critic's
 * saved take and questions come from the run; the reply is graded live by
 * the critic chat. One conversation per seat, kept while you switch.
 */
export function TakeASeat({
  brief,
  critics,
  sources,
  company,
  initial,
}: {
  brief: AccountBrief;
  critics: Partial<Record<SeatId, CriticResult>>;
  sources: ResearchSource[];
  company: string;
  /** The seat to start on (the meeting's main blocker, when there is one). */
  initial?: SeatId;
}) {
  const seats = SEAT_IDS.filter((s) => critics[s]);
  const [seat, setSeat] = useState<SeatId | undefined>(initial && critics[initial] ? initial : seats[0]);
  const [chats, setChats] = useState<Partial<Record<SeatId, ChatTurn[]>>>({});
  const critic = seat ? critics[seat] : undefined;
  if (!seats.length || !seat || !critic) return null;
  const name = criticFor("account", seat)?.name ?? seat;
  const questions = (critic.challenge_questions ?? []).filter((q) => q?.question);

  return (
    <section aria-labelledby="take-a-seat" className="rounded-[14px] border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="take-a-seat" className="font-display text-2xl font-semibold tracking-[-0.01em] text-foreground">
          Take a seat
        </h2>
        <span className="text-sm text-[#4A4F63]">
          Answer one critic live, from {company}’s evidence. <span className="font-mono text-xs text-muted-foreground">synthetic</span>
        </span>
      </div>

      <div role="group" aria-label="Choose a critic" className="mt-3.5 flex flex-wrap gap-2">
        {seats.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={s === seat}
            onClick={() => setSeat(s)}
            className={cx(
              "inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              s === seat ? "border-2 border-primary bg-brand-tint font-bold" : "border border-[#9097A6] bg-white font-medium hover:bg-muted",
            )}
          >
            {criticFor("account", s)?.name ?? s}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2.5">
        <SeatToken seat={seat} size="sm" />
        <div className="min-w-0 flex-1 rounded-[4px_14px_14px_14px] border border-border bg-background px-3.5 py-3">
          <p className="text-sm font-bold text-foreground">
            {name} <span className="font-mono text-xs font-normal text-muted-foreground">saved take · synthetic</span>
          </p>
          {critic.headline && <p className="mt-1 font-display text-lg font-semibold leading-snug text-foreground">“{stripMarks(critic.headline)}”</p>}
          {questions.length > 0 && (
            <ol className="mt-3 space-y-2 border-t border-border pt-3">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-2.5">
                  <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-foreground font-mono text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="min-w-0 text-[15px] font-medium leading-snug text-foreground">
                    <span className="sr-only">Question {i + 1}: </span>
                    <CitedLine text={q.question} sources={sources} />
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <CriticChat key={seat} brief={brief} critic={critic} sources={sources} turns={chats[seat] ?? []} onTurns={(t) => setChats((c) => ({ ...c, [seat]: t }))} />
    </section>
  );
}
