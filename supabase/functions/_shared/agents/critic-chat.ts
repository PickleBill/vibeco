// Answer the critic: the seller replies to one of the account critics, and the
// critic answers in character, grades the reply and asks one follow-up. The
// critic knows only the brief and its sources; it never accepts a new fact
// about the account on the seller's say-so.
import { callLLMWithTool } from "../llm-client.ts";
import { modelChain } from "../model-router.ts";
import { criticName, criticRole, lensAgentNote, lensOf } from "../lens.ts";
import { asSeller } from "../sellers/index.ts";
import type { CriticChatInput, CriticChatResult, CriticChatTurn, PersonaType } from "../types.ts";
import { customerListWording, sanitizeCitations } from "./account.ts";

const SEATS: PersonaType[] = ["skeptic", "champion", "competitor", "customer", "builder"];
const MAX_TEXT = 600;
const MAX_TURNS = 6; // three exchanges
const MAX_REPLY_WORDS = 110;

export class ChatInputError extends Error {}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Check and bound what the page sends. Throws ChatInputError on bad input. */
export function readChatInput(raw: unknown): CriticChatInput {
  const body = (raw ?? {}) as Record<string, unknown>;
  const brief = body.brief as Record<string, unknown> | undefined;
  if (!brief || typeof brief !== "object" || lensOf(brief) !== "account") throw new ChatInputError("This chat works on account runs only.");
  const seat = body.seat as PersonaType;
  if (!SEATS.includes(seat)) throw new ChatInputError("Unknown seat.");
  const message = str(body.message, MAX_TEXT);
  if (!message) throw new ChatInputError("Write a reply first.");
  const critic = (body.critic ?? {}) as Record<string, unknown>;
  const history: CriticChatTurn[] = (Array.isArray(body.history) ? body.history : [])
    .map((t) => (t ?? {}) as Record<string, unknown>)
    .filter((t) => t.role === "seller" || t.role === "critic")
    .map((t) => ({ role: t.role as CriticChatTurn["role"], content: str(t.content, MAX_TEXT) }))
    .filter((t) => t.content)
    .slice(-MAX_TURNS);
  return {
    brief,
    seat,
    message,
    question: str(body.question, 400) || undefined,
    critic: { headline: str(critic.headline, 200), perspective: str(critic.perspective, 1500) },
    history,
  };
}

interface SourceLike {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  snippet?: unknown;
  off_topic?: unknown;
}

/** The parts of an account brief the critic reads (client-supplied, so every field is checked). */
interface BriefView {
  company?: unknown;
  account_line?: unknown;
  problem?: unknown;
  revenue_model?: unknown;
  core_features?: unknown;
  people?: unknown;
  motion?: { label?: unknown };
  fit?: { grade?: unknown; motion?: unknown };
  customer_list?: { sentence?: unknown };
  migration_objection?: { objection?: unknown };
  research?: { sources?: unknown };
}

const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]).filter((x) => x && typeof x === "object") : []);

/** What the critic may know: the checked brief, short, with its numbered sources. */
export function factsDigest(brief: Record<string, unknown>): { text: string; valid: Set<number> } {
  const b = brief as BriefView;
  const usable = (list(b.research?.sources) as SourceLike[]).filter((s) => !s.off_topic && Number.isFinite(Number(s.id))).slice(0, 10);
  const valid = new Set(usable.map((s) => Number(s.id)));
  const line = (label: string, v: unknown, max = 500) => (typeof v === "string" && v.trim() ? `${label}: ${v.trim().slice(0, max)}` : "");
  const stack = list(b.core_features)
    .slice(0, 14)
    .map((l) => `- ${str(l.name, 40)}: ${str(l.tool, 60) || "nothing found"} (${str(l.status, 20)}${Array.isArray(l.sources) && l.sources.length ? ` [${l.sources.map(Number).join(", ")}]` : ""})`)
    .join("\n");
  const people = list(b.people)
    .slice(0, 6)
    .map((p) => `${str(p.name, 60)}, ${str(p.role, 80)} [${Number(p.source)}]`)
    .join("; ");
  const text = [
    line("Account", b.company, 120),
    line("In one line", b.account_line),
    line("Data situation", b.problem, 700),
    line("Why now", b.revenue_model, 600),
    stack ? `Stack read (checked in code):\n${stack}` : "",
    people ? `People the sources name: ${people}` : "",
    line("Motion", b.motion?.label, 20),
    typeof b.fit?.grade === "string" ? `Fit grade: ${b.fit.grade} for the ${str(b.fit.motion, 20) || "unclear"} motion` : "",
    line("Customer list", b.customer_list?.sentence, 200),
    line("Likely objection", b.migration_objection?.objection, 300),
    usable.length
      ? `Sources:\n${usable.map((s) => `[${Number(s.id)}] ${str(s.title, 140)} (${hostOf(String(s.url ?? ""))}): ${str(s.snippet, 240)}`).join("\n")}`
      : "Sources: none.",
  ]
    .filter(Boolean)
    .join("\n");
  return { text, valid };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const VERDICTS = ["strong", "partial", "misses"] as const;

export const criticChatToolSchema = {
  type: "function" as const,
  function: {
    name: "respond_as_critic",
    description: "Answer the seller in character, grade their latest reply, and ask one follow-up.",
    parameters: {
      type: "object",
      properties: {
        reply: { type: "string", description: "Your answer in the first person, at most 90 words, plain text, with [n] only for the listed sources." },
        verdict: {
          type: "string",
          enum: [...VERDICTS],
          description: "strong = specific, checkable and answers your concern; partial = right direction but vague or unproven; misses = dodges, generic, or contradicts the facts.",
        },
        follow_up: { type: "string", description: "One sharp question you'd ask next, at most 25 words. Empty if you're satisfied." },
      },
      required: ["reply", "verdict", "follow_up"],
      additionalProperties: false,
    },
  },
};

function cutWords(text: string, n: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= n) return text.trim();
  const cut = words.slice(0, n).join(" ");
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return stop > cut.length / 2 ? cut.slice(0, stop + 1) : `${cut}…`;
}

/** Per-model time limits: Flash answers in ~2-4s; Claude gets what's left. */
const TIMEOUTS = [8_000, 15_000];

export async function criticChat(input: CriticChatInput): Promise<CriticChatResult> {
  const { brief, seat } = input;
  const seller = asSeller((brief as { seller?: unknown }).seller);
  const sellerName = seller?.name ?? "the vendor";
  const name = criticName("account", seat) ?? seat;
  const { text: facts, valid } = factsDigest(brief);
  const earlier = [input.critic.headline, input.critic.perspective].filter(Boolean).join("\n").slice(0, 1500);

  const systemPrompt = `${criticRole("account", seat, brief)}

You are now in a short back-and-forth with a seller from ${sellerName} who is answering your challenge. Stay in character as the ${name}.

LANGUAGE RULE: RESPOND ONLY IN ENGLISH.

Rules:
1. First person, at most 90 words, plain text: no markdown, no lists.
2. Facts about the account come only from ACCOUNT FACTS. Cite them with [n], using only the listed source numbers.
3. If the seller states a fact about the account that isn't in ACCOUNT FACTS, don't accept it: say you'd need to see it.
4. Never invent names, numbers, dates, tools, customers or prices. Don't make claims about what ${sellerName} can or can't do beyond what the seller says; question them instead.
5. Then grade the seller's latest reply: strong, partial or misses. Be fair: a specific, checkable answer that meets your concern is strong.
6. follow_up: one sharp question (at most 25 words), or "" if you're satisfied.
7. Never write outreach emails or messages.${earlier ? `\n\nYour earlier take on this account:\n${earlier}` : ""}${lensAgentNote("account", brief)}`;

  const transcript = [
    input.question ? `The question you asked: ${input.question}` : "",
    ...input.history.map((t) => `${t.role === "seller" ? "Seller" : "You"}: ${t.content}`),
    `Seller (latest reply): ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n");
  // One user turn holding the whole conversation works the same on every model.
  const userContent = `ACCOUNT FACTS (the only facts you know about this account)
<<<FACTS
${facts}
FACTS>>>

THE CONVERSATION
${transcript}

Answer with respond_as_critic.`;

  const models = modelChain("critic-chat");
  let lastError: unknown;
  for (const [i, model] of models.entries()) {
    const started = Date.now();
    try {
      const out = await callLLMWithTool<{ reply?: string; verdict?: string; follow_up?: string }>({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [criticChatToolSchema],
        toolChoice: { type: "function", function: { name: "respond_as_critic" } },
        timeoutMs: TIMEOUTS[i] ?? 15_000,
      });
      const tidy = (t: unknown) => {
        const clean = sanitizeCitations(String(t ?? ""), valid).replace(/\s+/g, " ").trim();
        return seller ? customerListWording(clean, seller.name) : clean;
      };
      const reply = cutWords(tidy(out.reply), MAX_REPLY_WORDS);
      if (!reply) throw new Error(`Empty reply from ${model}`);
      const verdict = VERDICTS.includes(out.verdict as (typeof VERDICTS)[number]) ? (out.verdict as CriticChatResult["verdict"]) : "partial";
      return { reply, verdict, follow_up: cutWords(tidy(out.follow_up), 30), model, latencyMs: Date.now() - started };
    } catch (e) {
      lastError = e;
      console.error(`[critic-chat] ${model} failed after ${Date.now() - started}ms:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastError ?? new Error("No model answered.");
}
