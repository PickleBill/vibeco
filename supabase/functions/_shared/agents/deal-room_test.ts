// Deal Room: input checks, the latest-answer-wins merge, and the store round trip.
import { assert, assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import {
  cleanDealRoom,
  DealRoomInputError,
  MAX_CLAIMS,
  mergeAnswer,
  readDealRoomInput,
  runDealRoom,
  type DealRoom,
  type DealRoomRow,
  type DealRoomStore,
} from "./deal-room.ts";

const ID = "9c769b0b-8282-4c6d-91d7-c59b1bae8ca5";

function status(fn: () => unknown): number {
  try {
    fn();
  } catch (e) {
    if (e instanceof DealRoomInputError) return e.status;
    throw e;
  }
  return 0;
}

Deno.test("readDealRoomInput takes an answer and bounds its strings", () => {
  assertEquals(readDealRoomInput({ report_id: ID, claim_id: "stack:bi-tools:metabase", answer: "right" }), {
    kind: "answer",
    report_id: ID,
    claim_id: "stack:bi-tools:metabase",
    answer: "right",
  });
  const fix = readDealRoomInput({ report_id: ` ${ID} `, claim_id: "motion", answer: "fix", text: `  ${"x".repeat(500)} `, note: " ok\u0007 then " });
  assert(fix.kind === "answer");
  assertEquals(fix.text?.length, 400);
  assertEquals(fix.note, "ok then");
  // Text is a fix's only; a right answer drops it.
  const right = readDealRoomInput({ report_id: ID, claim_id: "why:2026-09:0", answer: "right", text: "ignored" });
  assert(right.kind === "answer" && right.text === undefined);
});

Deno.test("readDealRoomInput reads, and refuses bad ids and answers", () => {
  assertEquals(readDealRoomInput({ report_id: ID, read: true }), { kind: "read", report_id: ID });
  assertEquals(status(() => readDealRoomInput({ report_id: "not-a-uuid", read: true })), 400);
  assertEquals(status(() => readDealRoomInput(null)), 400);
  assertEquals(status(() => readDealRoomInput({ report_id: ID, claim_id: "fit:grade", answer: "right" })), 400);
  assertEquals(status(() => readDealRoomInput({ report_id: ID, claim_id: `stack:${"a".repeat(130)}`, answer: "right" })), 400);
  assertEquals(status(() => readDealRoomInput({ report_id: ID, claim_id: "stack:BI Tools:<b>", answer: "right" })), 400);
  assertEquals(status(() => readDealRoomInput({ report_id: ID, claim_id: "motion", answer: "maybe" })), 400);
  assertEquals(status(() => readDealRoomInput({ report_id: ID, claim_id: "motion", answer: "fix", text: "   " })), 400);
});

Deno.test("mergeAnswer keeps the latest answer per claim and every other claim", () => {
  const first = mergeAnswer(null, { kind: "answer", report_id: ID, claim_id: "motion", answer: "unsure" }, "2026-10-07T10:00:00.000Z");
  const second = mergeAnswer(first, { kind: "answer", report_id: ID, claim_id: "stack:ai:claude", answer: "fix", text: "ChatGPT Enterprise", note: "Claude was a pilot" }, "2026-10-07T10:01:00.000Z");
  const third = mergeAnswer(second, { kind: "answer", report_id: ID, claim_id: "motion", answer: "right" }, "2026-10-07T10:02:00.000Z");
  assertEquals(third, {
    responses: {
      motion: { answer: "right", at: "2026-10-07T10:02:00.000Z" },
      "stack:ai:claude": { answer: "fix", text: "ChatGPT Enterprise", note: "Claude was a pilot", at: "2026-10-07T10:01:00.000Z" },
    },
    updated_at: "2026-10-07T10:02:00.000Z",
  });
});

Deno.test("mergeAnswer caps the claims; an answered claim can still change", () => {
  const responses: Record<string, unknown> = {};
  for (let i = 0; i < MAX_CLAIMS; i++) responses[`why:2026-09:${i}`] = { answer: "right", at: "t" };
  const full = { responses, updated_at: "t" };
  assertThrows(() => mergeAnswer(full, { kind: "answer", report_id: ID, claim_id: "motion", answer: "right" }, "now"), DealRoomInputError);
  const changed = mergeAnswer(full, { kind: "answer", report_id: ID, claim_id: "why:2026-09:3", answer: "unsure" }, "now");
  assertEquals(changed.responses["why:2026-09:3"], { answer: "unsure", at: "now" });
  assertEquals(Object.keys(changed.responses).length, MAX_CLAIMS);
});

Deno.test("cleanDealRoom drops malformed entries", () => {
  assertEquals(cleanDealRoom("nope"), null);
  assertEquals(
    cleanDealRoom({
      responses: {
        motion: { answer: "right", at: "t" },
        "stack:bi-tools:sigma": { answer: "fix", at: "t" },
        "fit:grade": { answer: "right", at: "t" },
        "why:2026-08:0": { answer: "later" },
      },
      updated_at: "t",
    }),
    { responses: { motion: { answer: "right", at: "t" } }, updated_at: "t" },
  );
});

function memoryStore(row: DealRoomRow | null) {
  const saved: Record<string, unknown>[] = [];
  const store: DealRoomStore = {
    load: () => Promise.resolve(row),
    save: (_id, analysis) => {
      saved.push(analysis);
      return Promise.resolve();
    },
  };
  return { store, saved };
}

Deno.test("runDealRoom saves into auto_analysis without touching the rest", async () => {
  const { store, saved } = memoryStore({
    brief: { lens: "account" },
    auto_analysis: { perspectives: [{ persona: "skeptic" }], synthesis: { confidence_score: 60 } },
  });
  const now = new Date("2026-10-07T12:00:00.000Z");
  const out = await runDealRoom({ kind: "answer", report_id: ID, claim_id: "stack:bi-tools:metabase", answer: "right" }, store, now);
  assertEquals(out.ok, true);
  assertEquals(out.deal_room?.responses["stack:bi-tools:metabase"], { answer: "right", at: now.toISOString() });
  assertEquals(saved.length, 1);
  assertEquals(saved[0].perspectives, [{ persona: "skeptic" }]);
  assertEquals(saved[0].synthesis, { confidence_score: 60 });
  assertEquals((saved[0].deal_room as { updated_at: string }).updated_at, now.toISOString());
});

Deno.test("runDealRoom reads, and only account runs open", async () => {
  const room: DealRoom = { responses: { motion: { answer: "unsure", at: "t" } }, updated_at: "t" };
  const { store } = memoryStore({ brief: { lens: "account" }, auto_analysis: { deal_room: room } });
  assertEquals(await runDealRoom({ kind: "read", report_id: ID }, store), { deal_room: room });
  const empty = memoryStore({ brief: { lens: "account" }, auto_analysis: null });
  assertEquals(await runDealRoom({ kind: "read", report_id: ID }, empty.store), { deal_room: null });

  const idea = memoryStore({ brief: { lens: "idea" }, auto_analysis: {} });
  const err = await assertRejects(() => runDealRoom({ kind: "answer", report_id: ID, claim_id: "motion", answer: "right" }, idea.store), DealRoomInputError);
  assertEquals(err.status, 404);
  assertEquals(idea.saved.length, 0);
  const missing = memoryStore(null);
  assertEquals((await assertRejects(() => runDealRoom({ kind: "read", report_id: ID }, missing.store), DealRoomInputError)).status, 404);
});
