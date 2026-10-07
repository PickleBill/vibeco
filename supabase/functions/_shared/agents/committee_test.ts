// Unit tests for the committee simulation's pure parts, the save/cache flow
// (with a fake store) and the model fallback (with a stubbed fetch). No network.
// Run: deno test --allow-env --allow-net --allow-read --no-lock supabase/functions/_shared/agents/committee_test.ts
import {
  assert,
  assertEquals,
  assertMatch,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { LLMError } from "../error-handler.ts";
import type { CommitteeResult, CommitteeSeat, CommitteeSimInput } from "../types.ts";
import {
  bandForLabel,
  COMMITTEE_SEATS,
  CommitteeInputError,
  committeePrompt,
  committeeToolSchema,
  dropUngrounded,
  groundingFrom,
  labelForBand,
  normalizeCommittee,
  percentBand,
  readBaseline,
  readCommitteeInput,
  readCommitteeRequest,
  readCritics,
  readWhatIf,
  roleNames,
  runCommittee,
  simulateCommittee,
  ungrounded,
  withCommittee,
  type CommitteeStore,
} from "./committee.ts";

// A saved account run (Relay, seller Omni): brief + the seven agents' analysis.
const RUN = JSON.parse(await Deno.readTextFile(new URL("./fixtures/account-run-relay.json", import.meta.url)));
const BRIEF = RUN.brief as Record<string, unknown>;
const PERSPECTIVES = RUN.auto_analysis.perspectives as unknown[];
const REPORT_ID = RUN.id as string;

const input = (what_if: string[] = []): CommitteeSimInput => readCommitteeInput(BRIEF, PERSPECTIVES, what_if);
const ctx = (what_if: string[] = []) => committeePrompt(input(what_if)).context;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/** What a model might send for Relay, grounded in the fixture's facts. */
const CLEAN = {
  seats: [
    { seat: "champion", stance_start: 1, stance_end: 2, influence: 2, top_concern: "CS reads Metabase while customers see Operational Insights; one governed definition would end the mismatch [1] [2]." },
    { seat: "skeptic", stance_start: -1, stance_end: 0, influence: 3, top_concern: "Metabase already covers CS reporting; I need proof a second tool earns its cost after the raise [1] [3]." },
    { seat: "competitor", stance_start: -2, stance_end: -2, influence: 1, top_concern: "Metabase sits in the CS workflow with HubSpot; a semantic layer project is risk without proof [1]." },
    { seat: "customer", stance_start: 0, stance_end: 1, influence: 1, top_concern: "Our internal numbers and what customers see in the Dashboard don't always match [6]." },
    { seat: "builder", stance_start: -1, stance_end: 0, influence: 2, top_concern: "No source names the warehouse behind the data volume, so the scope is unknown [8]." },
  ],
  rounds: [
    {
      title: "Where everyone starts",
      turns: [
        { seat: "champion", says: "My team reads Metabase for CS while customers get Operational Insights [1] [2]. When those disagree, we lose trust. I want one definition of each metric, so I'd hear Omni out.", stance_after: 1 },
        { seat: "skeptic", says: "We just raised $36 million to scale operational intelligence [3]. That money goes to the product first. Show me why internal reporting needs a second tool when Metabase already works for CS.", stance_after: -1 },
        { seat: "competitor", says: "Metabase is already where CS tells activity apart from behavior change [1]. Swapping it means retraining people and rebuilding questions for a gain nobody has measured.", stance_after: -2 },
        { seat: "builder", says: "Before anyone promises anything: no source names the warehouse behind more than 1 billion data points a week [8]. Until we know that, I can't size the work.", stance_after: -1 },
      ],
    },
    {
      title: "The mismatch versus the cost",
      turns: [
        { seat: "customer", says: "When a customer asks why their Dashboard shows a different trend than our CS view, I can't answer fast [6]. If one model fed both, I'd stop reconciling by hand.", stance_after: 1 },
        { seat: "skeptic", says: "That's a real cost, but an internal one. Is the mismatch costing renewals, or is it an annoyance? That answer decides the budget.", stance_after: -1 },
        { seat: "champion", says: "It reaches the product too: Operational Insights is customer-facing [2]. If one governed model sits under both, it's one investment, not two.", stance_after: 2 },
        { seat: "builder", says: "That helps. If the semantic layer replaces SQL we maintain twice, the effort pays back. What decides it is how much logic lives in Metabase questions today.", stance_after: 0 },
      ],
    },
    {
      title: "Where it lands",
      turns: [
        { seat: "skeptic", says: "I'll fund a scoped look, not a migration. Bring me the mismatch cases and the warehouse answer first.", stance_after: 0 },
        { seat: "competitor", says: "Expect Metabase to stay cheaper for CS alone. The embedded angle is where I'm exposed.", stance_after: -2 },
        { seat: "champion", says: "I'll sponsor an evaluation framed around Operational Insights and the CS view together, with our analytics engineer scoping the warehouse side.", stance_after: 2 },
      ],
    },
  ],
  path_to_yes: [
    { step: "Ask which warehouse holds the weekly data volume and who owns it [8].", seat: "builder", why: "The analytics engineer can't size the work until the warehouse is known." },
    { step: "Collect cases where the CS view and the customer Dashboard disagree [1] [6].", seat: "skeptic", why: "Turns the mismatch into a cost the CFO can weigh." },
    { step: "Frame one governed model under Operational Insights and internal reporting [2].", seat: "champion", why: "One investment that serves the product and the CS team." },
  ],
  main_blocker: {
    seat: "skeptic",
    why: "The CFO holds the budget and sees Metabase as good enough for CS after the raise [3].",
    what_would_flip_it: "Evidence that the metric mismatch costs renewals, plus a scope that covers the customer-facing product.",
  },
  outcome: {
    label: "Coin flip",
    low: 35,
    high: 55,
    summary: "The Head of Data sponsors and the analytics engineer opens up, but the CFO funds only a scoped look until the mismatch has a cost and the warehouse is known.",
  },
};

// ─── Input reader ───

Deno.test("request: a saved run's id, lowercased, with no what-ifs", () => {
  const r = readCommitteeRequest({ report_id: REPORT_ID.toUpperCase() });
  assertEquals(r, { report_id: REPORT_ID, what_if: [] });
});

Deno.test("request: a bad id or an empty body is a 400", () => {
  for (const body of [{ report_id: "not-a-uuid" }, { report_id: 42 }, {}, null, "text"]) {
    const e = assertThrows(() => readCommitteeRequest(body), CommitteeInputError);
    assertEquals(e.status, 400);
  }
});

Deno.test("request: inline brief and perspectives become a checked input", () => {
  const r = readCommitteeRequest({ brief: BRIEF, perspectives: PERSPECTIVES, what_if: ["A new head of data joins"] });
  assertEquals(r.report_id, undefined);
  assertEquals(r.input!.what_if, ["A new head of data joins"]);
  assertEquals(r.input!.perspectives.length, 5);
});

Deno.test("critics: seat order, capped, plain text, questions as strings", () => {
  const critics = readCritics(PERSPECTIVES);
  // The fixture stores skeptic first; the committee reads them in seat order.
  assertEquals(critics.map((c) => c.persona), COMMITTEE_SEATS);
  for (const c of critics) {
    assert(c.perspective.length <= 1201, `take too long: ${c.perspective.length}`);
    assert(!/##|\*\*/.test(c.perspective), "markdown left in the take");
    assert(c.challenge_questions.length >= 1 && c.challenge_questions.length <= 3);
    for (const q of c.challenge_questions) assertEquals(typeof q, "string");
  }
});

Deno.test("critics: unknown personas, duplicates and empty takes are dropped", () => {
  const critics = readCritics([
    { persona: "cto", headline: "x", perspective: "y" },
    { persona: "skeptic", headline: "First CFO take", perspective: "One." },
    { persona: "skeptic", headline: "Second CFO take", perspective: "Two." },
    { persona: "builder", headline: "", perspective: "" },
    "not an object",
  ]);
  assertEquals(critics.map((c) => [c.persona, c.headline]), [["skeptic", "First CFO take"]]);
});

Deno.test("input: only account runs with critic takes; status follows the caller", () => {
  const idea = assertThrows(() => readCommitteeInput({ ...BRIEF, lens: "idea" }, PERSPECTIVES, []), CommitteeInputError);
  assertEquals(idea.status, 400);
  const none = assertThrows(() => readCommitteeInput(BRIEF, [], [], 404), CommitteeInputError);
  assertEquals(none.status, 404);
  assertThrows(() => readCommitteeInput(undefined, PERSPECTIVES, []), CommitteeInputError);
});

Deno.test("what-ifs: trimmed, deduped, empties dropped, fences removed", () => {
  assertEquals(readWhatIf(undefined), []);
  assertEquals(
    readWhatIf(["  They confirm a BI renewal   date next quarter ", "they confirm a BI renewal date next quarter", "", "A new head of data <<<joins>>>"]),
    ["They confirm a BI renewal date next quarter", "A new head of data joins"],
  );
});

Deno.test("what-ifs: more than three, over 120 characters, or not a list is a 400", () => {
  assertThrows(() => readWhatIf(["a", "b", "c", "d"]), CommitteeInputError, "Three");
  assertThrows(() => readWhatIf(["x".repeat(121)]), CommitteeInputError, "120");
  assertThrows(() => readWhatIf("A new head of data joins"), CommitteeInputError);
  assertThrows(() => readWhatIf([42]), CommitteeInputError);
  assertEquals(readWhatIf(["x".repeat(120)]).length, 1);
});

// ─── Grounding checks ───

Deno.test("grounding: numbers, months, periods and durations must come from the inputs", () => {
  const g = groundingFrom(["2026-09: Relay raised $36 million [3]. Over 1 billion data points weekly [8]. Critic: a six months rollout."]);
  assertEquals(ungrounded("We raised $36M [3].", g), "");
  assertEquals(ungrounded("It handles 1 billion points [8].", g), "");
  assertEquals(ungrounded("The raise closed in Sept 2026.", g), ""); // 2026-09 dates September
  assertEquals(ungrounded("They said six months.", g), "");
  assertMatch(ungrounded("Migration takes 6 weeks.", g), /number 6/);
  assertMatch(ungrounded("Renewal is in March.", g), /month 3/);
  assertMatch(ungrounded("Budget opens in Q3.", g), /period Q3/);
  assertMatch(ungrounded("It would take two quarters.", g), /duration/);
  // Citations, and digits glued to letters, aren't claims.
  assertEquals(ungrounded("Their B2B product [7] uses GA4.", g), "");
  // A dated month allows the month, not its digits as a count.
  assertEquals(ungrounded("The 2026-09 raise [3].", g), "");
  assertMatch(ungrounded("Expect 9 months of work.", g), /number 9/);
});

Deno.test("grounding: only the offending sentence goes", () => {
  const g = groundingFrom(["Relay raised $36 million [3]."]);
  assertEquals(
    dropUngrounded("After the $36 million raise [3], budget is there. The renewal is in 90 days. Ask who owns it?", g),
    "After the $36 million raise [3], budget is there. Ask who owns it?",
  );
  assertEquals(dropUngrounded("We have 40 analysts.", g, ["40"]), "We have 40 analysts.");
});

Deno.test("role names replace persona ids, but not ordinary words or proper names", () => {
  assertEquals(roleNames("As the Skeptic said, the champion's case is thin."), "As the CFO said, the Head of Data's case is thin.");
  assertEquals(roleNames("The Builder disagrees with the competitor."), "The analytics engineer disagrees with the incumbent BI vendor.");
  assertEquals(roleNames("the Customer Success team and the customer"), "the Customer Success team and the customer");
});

// ─── Outcome band ───

Deno.test("band: steps of 5, 10 to 30 wide, inside 5..95", () => {
  assertEquals(percentBand(33, 47), { low: 35, high: 45 });
  assertEquals(percentBand(10, 90), { low: 35, high: 65 });
  assertEquals(percentBand(50, 50), { low: 50, high: 60 });
  assertEquals(percentBand(60, 40), { low: 40, high: 60 });
  assertEquals(percentBand(0, 3), { low: 5, high: 15 });
  assertEquals(percentBand(98, 100), { low: 85, high: 95 });
  assertEquals(percentBand(0.4, 0.55), { low: 40, high: 55 });
  assertEquals(percentBand("40", undefined), { low: 40, high: 60 });
});

Deno.test("band: the label wins and the band moves to fit it", () => {
  assertEquals(bandForLabel("Likely yes", { low: 30, high: 40 }), { low: 55, high: 65 });
  assertEquals(bandForLabel("Uphill", { low: 35, high: 55 }), { low: 25, high: 45 });
  assertEquals(bandForLabel("Coin flip", { low: 60, high: 80 }), { low: 45, high: 65 });
  assertEquals(bandForLabel("Too early", { low: 20, high: 50 }), { low: 20, high: 50 });
  assertEquals(labelForBand({ low: 55, high: 65 }), "Likely yes");
  assertEquals(labelForBand({ low: 30, high: 50 }), "Coin flip");
  assertEquals(labelForBand({ low: 25, high: 45 }), "Uphill");
});

// ─── Normalizer ───

Deno.test("normalize: a grounded answer passes through intact", () => {
  const out = normalizeCommittee(clone(CLEAN), ctx());
  assertEquals(out.seats.map((s) => s.seat), COMMITTEE_SEATS);
  assertEquals(out.seats.map((s) => s.role), ["Head of Data", "CFO", "Incumbent BI vendor", "Business user", "Analytics engineer"]);
  assertEquals(out.rounds.length, 3);
  assertEquals(out.rounds.map((r) => r.turns.length), [4, 4, 3]);
  // Every grounded line survives the checks word for word.
  const raw = CLEAN.rounds.flatMap((r) => r.turns.map((t) => t.says));
  assertEquals(out.rounds.flatMap((r) => r.turns.map((t) => t.says)), raw);
  assertEquals(out.seats.map((s) => [s.stance_start, s.stance_end]), [[1, 2], [-1, 0], [-2, -2], [0, 1], [-1, 0]]);
  assertEquals(out.path_to_yes.length, 3);
  assertEquals(out.main_blocker.seat, "skeptic");
  assertEquals(out.outcome, { ...CLEAN.outcome, label: "Coin flip", model_label: "Coin flip", model_low: 35, model_high: 55 });
  assertEquals(out.what_if, undefined);
});

Deno.test("normalize: stances clamp to -2..2, influence to 1..3; the incumbent tops out at 0 and 2", () => {
  const raw = clone(CLEAN);
  raw.seats[0] = { ...raw.seats[0], stance_start: 5, influence: 7 };
  raw.seats[1] = { ...raw.seats[1], stance_start: -9, influence: 0 };
  raw.seats[2] = { ...raw.seats[2], stance_start: 2, influence: 3 };
  (raw.seats[3] as Record<string, unknown>).influence = "lots";
  const out = normalizeCommittee(raw, ctx());
  const seat = (id: string) => out.seats.find((s) => s.seat === id)!;
  assertEquals([seat("champion").stance_start, seat("champion").influence], [2, 3]);
  assertEquals([seat("skeptic").stance_start, seat("skeptic").influence], [-2, 1]);
  assertEquals([seat("competitor").stance_start, seat("competitor").influence], [0, 2]);
  assertEquals(seat("customer").influence, 1); // the seat's default
  for (const t of out.rounds.flatMap((r) => r.turns)) assert(t.stance_after >= -2 && t.stance_after <= 2);
});

Deno.test("normalize: one step per turn, and stance_end is the seat's last stance_after", () => {
  const raw = clone(CLEAN);
  raw.seats[1].stance_start = -2; // CFO opens blocking...
  raw.rounds[0].turns[1].stance_after = 2; // ...and claims to jump to sponsor in one turn
  raw.seats[1].stance_end = 2; // the model's stance_end disagrees with the turns
  const out = normalizeCommittee(raw, ctx());
  const cfoTurns = out.rounds.flatMap((r) => r.turns).filter((t) => t.seat === "skeptic").map((t) => t.stance_after);
  assertEquals(cfoTurns, [-1, -1, 0]);
  assertEquals(out.seats[1].stance_end, 0);
  // A seat that never speaks ends where it started.
  const quiet = clone(CLEAN);
  quiet.rounds[1].turns = quiet.rounds[1].turns.filter((t) => t.seat !== "customer");
  quiet.seats[3].stance_end = 2;
  assertEquals(normalizeCommittee(quiet, ctx()).seats[3].stance_end, quiet.seats[3].stance_start);
});

Deno.test("normalize: turns for unknown seats are dropped; rounds and turns are capped", () => {
  const raw = clone(CLEAN) as Record<string, unknown> & typeof CLEAN;
  raw.rounds[0].turns.unshift({ seat: "cto", says: "I decide.", stance_after: 2 }, { seat: "Skeptic", says: "Hi.", stance_after: 0 });
  const many = Array.from({ length: 7 }, () => ({ seat: "customer", says: "I need answers faster.", stance_after: 0 }));
  raw.rounds.push({ title: "A fourth round nobody asked for", turns: many });
  raw.rounds[2].turns = [...raw.rounds[2].turns, ...many];
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds.length, 3);
  assertEquals(out.rounds[0].turns.length, 4);
  assert(!out.rounds.flatMap((r) => r.turns).some((t) => !COMMITTEE_SEATS.includes(t.seat)));
  assertEquals(out.rounds[2].turns.length, 5);
});

Deno.test("normalize: missing seats are filled from the critics' headlines at stance 0", () => {
  const raw = clone(CLEAN);
  raw.seats = raw.seats.filter((s) => s.seat === "champion" || s.seat === "skeptic" || s.seat === "competitor");
  raw.rounds[1].turns = raw.rounds[1].turns.filter((t) => t.seat !== "customer");
  const c = ctx();
  const out = normalizeCommittee(raw, c);
  assertEquals(out.seats.map((s) => s.seat), COMMITTEE_SEATS);
  const customer = out.seats[3];
  assertEquals([customer.stance_start, customer.stance_end, customer.influence], [0, 0, 1]);
  assertEquals(customer.role, "Business user");
  const headline = c.critics.find((x) => x.persona === "customer")!.headline;
  assert(headline.startsWith(customer.top_concern.replace(/…$/, "")), customer.top_concern);
  // The builder still spoke; its stances move from the filled-in 0.
  const builder = out.seats[4];
  assertEquals(builder.stance_start, 0);
  assertEquals(builder.stance_end, out.rounds.flatMap((r) => r.turns).filter((t) => t.seat === "builder").at(-1)!.stance_after);
});

Deno.test("normalize: citations to missing or off-topic sources are stripped", () => {
  const raw = clone(CLEAN);
  // Source 7 in the fixture is off topic; 42 doesn't exist.
  raw.rounds[0].turns[0].says = "Metabase is our CS tool [1] [7]. Customers see Operational Insights [2, 42]. Ask about the recall [7].";
  raw.seats[0].top_concern = "One definition of each metric [42].";
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds[0].turns[0].says, "Metabase is our CS tool [1]. Customers see Operational Insights [2]. Ask about the recall.");
  assertEquals(out.seats[0].top_concern, "One definition of each metric.");
});

Deno.test("normalize: invented numbers, months and durations are removed, sentence by sentence", () => {
  const raw = clone(CLEAN);
  raw.rounds[0].turns[3].says = "No source names the warehouse [8]. A migration like this takes 6 months. Renewal lands in March. It needs two quarters of work.";
  raw.path_to_yes.push({ step: "Run a 2-week pilot with 40 analysts.", seat: "builder", why: "Fast proof." });
  raw.main_blocker.why = "The CFO's budget is $250K and closes in Q4.";
  raw.outcome.summary = "About 45% likely. The CFO needs a cost case.";
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds[0].turns[3].says, "No source names the warehouse [8].");
  assertEquals(out.path_to_yes.length, 3); // the invented pilot step is gone
  assertEquals(out.main_blocker.why, out.seats[1].top_concern); // fell back to the CFO's concern
  // 45 isn't the band (35-55), so that sentence goes; the band's own numbers may be quoted.
  assertEquals(out.outcome.summary, "The CFO needs a cost case.");
  raw.outcome.summary = "Somewhere between 35 and 55 percent.";
  assertEquals(normalizeCommittee(raw, ctx()).outcome.summary, "Somewhere between 35 and 55 percent.");
});

Deno.test("normalize: a turn left empty by the checks is dropped; too few turns fail", () => {
  const raw = clone(CLEAN);
  raw.rounds[2].turns[1].says = "Our renewal is in 18 months.";
  assertEquals(normalizeCommittee(raw, ctx()).rounds[2].turns.length, 2);
  const thin = clone(CLEAN);
  thin.rounds = [{ title: "Only", turns: thin.rounds[0].turns.slice(0, 2) }];
  assertThrows(() => normalizeCommittee(thin, ctx()), Error, "usable turns");
  assertThrows(() => normalizeCommittee({}, ctx()), Error);
});

Deno.test("normalize: persona ids in the text become role names", () => {
  const raw = clone(CLEAN);
  raw.rounds[1].turns[2].says = "The Skeptic is right about cost, but the builder can scope it.";
  assertEquals(normalizeCommittee(raw, ctx()).rounds[1].turns[2].says, "The CFO is right about cost, but the analytics engineer can scope it.");
});

Deno.test("normalize: word caps, titles and defaults", () => {
  const raw = clone(CLEAN);
  raw.rounds[0].title = "The opening positions around the whole table today.";
  raw.rounds[1].title = "";
  raw.rounds[0].turns[0].says = Array.from({ length: 60 }, () => "word").join(" ");
  raw.seats[0].top_concern = Array.from({ length: 30 }, () => "concern").join(" ");
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds[0].title, "The opening positions around the whole");
  assertEquals(out.rounds[1].title, "Round 2");
  assertEquals(out.rounds[0].turns[0].says.split(" ").length, 45);
  assert(out.rounds[0].turns[0].says.endsWith("…"));
  assertEquals(out.seats[0].top_concern.split(" ").length, 20);
});

Deno.test("normalize: path, blocker and outcome fallbacks", () => {
  const raw = clone(CLEAN) as unknown as Record<string, Record<string, unknown> | unknown[]>;
  (raw.path_to_yes as unknown[]).push(
    { step: "Bring in the CTO.", seat: "cto", why: "x" },
    { step: "Show the semantic layer on their CS questions.", seat: "champion", why: "Proof." },
    { step: "A fifth step.", seat: "customer", why: "Too many." },
  );
  raw.main_blocker = { seat: "board", why: "", what_would_flip_it: "" };
  raw.outcome = { label: "Certain", low: 70, high: 95, summary: "" };
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.path_to_yes.length, 4);
  assert(!out.path_to_yes.some((p) => !COMMITTEE_SEATS.includes(p.seat)));
  // Lowest end stance among the buyers (the incumbent isn't one), then most influence:
  // the CFO and the analytics engineer both end at 0; the CFO has more influence.
  assertEquals(out.main_blocker.seat, "skeptic");
  assertStringIncludes(out.main_blocker.what_would_flip_it, "A clear answer to:");
  assertEquals(out.outcome.model_label, "Likely yes"); // from the band's midpoint, before the evidence weighs in
  assertEquals([out.outcome.model_low, out.outcome.model_high], [70, 95]);
  assert(out.outcome.summary.startsWith(`${out.outcome.label}.`));
});

Deno.test("normalize: nested arrays sent as JSON strings are read", () => {
  const raw = clone(CLEAN) as Record<string, unknown>;
  raw.rounds = JSON.stringify(CLEAN.rounds.map((r) => ({ ...r, turns: JSON.stringify(r.turns) })));
  raw.seats = CLEAN.seats.map((s) => JSON.stringify(s));
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds.length, 3);
  assertEquals(out.seats[1].stance_start, -1);
});

// ─── Seller and customer list ───

const LISTED: Record<string, unknown> = {
  ...BRIEF,
  company: "Guitar Center",
  customer_list: { on_list: true, listed_as: "Guitar Center", sentence: "Guitar Center is on Omni's public customer list (listed as Guitar Center)." },
};

Deno.test("customer list: 'not a customer' wording is rewritten in every line", () => {
  const raw = clone(CLEAN);
  raw.rounds[0].turns[2].says = "They aren't an Omni customer, and Metabase works [1].";
  raw.outcome.summary = "Relay is not a current Omni customer. The CFO wants proof.";
  const out = normalizeCommittee(raw, ctx());
  assertEquals(out.rounds[0].turns[2].says, "They aren't on Omni's public customer list, and Metabase works [1].");
  assertEquals(out.outcome.summary, "Relay is not on Omni's public customer list. The CFO wants proof.");
});

Deno.test("customer list: an account on the list is an expansion meeting, not a migration", () => {
  const { system } = committeePrompt(readCommitteeInput(LISTED, PERSPECTIVES, []));
  assertStringIncludes(system, "Guitar Center is on Omni's public customer list");
  assertStringIncludes(system, "never a first purchase or a migration to Omni");
  assertStringIncludes(system, "agrees to expanding its use of Omni");
  const { system: unlisted } = committeePrompt(input());
  assertStringIncludes(unlisted, "agrees to an evaluation or pilot of Omni");
  assert(!unlisted.includes("never a first purchase"));
});

// ─── Prompt ───

Deno.test("prompt: seats by role, the seller, facts with sources, the critics' takes", () => {
  const { system, user, context } = committeePrompt(input());
  assertStringIncludes(system, "champion = Head of Data");
  assertStringIncludes(system, "competitor = Incumbent BI vendor");
  assertStringIncludes(system, "The user sells for Omni");
  assertStringIncludes(system, "GROUNDING");
  assert(!system.includes("WHAT-IFS"));
  assertStringIncludes(user, "<<<FACTS");
  assertStringIncludes(user, "[1] Director, Customer Success Enablement");
  assertStringIncludes(user, "Buying committee by role:");
  assertStringIncludes(user, "[skeptic] CFO:");
  assert(!user.includes("<<<WHATIF"));
  // Source 7 is off topic: it can't be cited.
  assertEquals([...context.valid].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 8, 9, 10]);
});

Deno.test("prompt: what-ifs are fenced, true for this run only, and their numbers are allowed", () => {
  const whatIf = ["They confirm a BI renewal date next quarter", "A new head of data joins in 90 days"];
  const { system, user, context } = committeePrompt(input(whatIf));
  assertStringIncludes(system, "WHAT-IFS");
  assertStringIncludes(system, "true for this simulation only");
  assertStringIncludes(user, "<<<WHATIF\n- They confirm a BI renewal date next quarter\n- A new head of data joins in 90 days\nWHATIF>>>");
  assertEquals(ungrounded("With a new head of data in 90 days, I'd sponsor it.", context.grounding), "");
  const raw = clone(CLEAN);
  assertEquals(normalizeCommittee(raw, context).what_if, whatIf);
});

Deno.test("baseline: a plain run's stances and band, clamped; unusable input is ignored", () => {
  const base = readBaseline({
    seats: [{ seat: "skeptic", stance_start: -5, stance_end: 1 }, { seat: "competitor", stance_start: 2, stance_end: -1 }, { seat: "cto", stance_start: 2 }],
    outcome: { label: "Coin flip", low: 33, high: 52 },
  });
  assertEquals(base, {
    seats: [{ seat: "skeptic", stance_start: -2, stance_end: 1 }, { seat: "competitor", stance_start: 0, stance_end: -1 }],
    outcome: { label: "Coin flip", low: 35, high: 50 },
  });
  assertEquals(readBaseline(undefined), undefined);
  assertEquals(readBaseline({ seats: [], outcome: { label: "Coin flip", low: 40, high: 50 } }), undefined);
  assertEquals(readBaseline({ seats: CLEAN.seats, outcome: { label: "Maybe" } }), undefined);
});

Deno.test("baseline: a what-if run starts from it; its band may be quoted, its stances aren't facts", () => {
  const baseline = readBaseline({ ...CLEAN, outcome: { label: "Uphill", low: 20, high: 40 } })!;
  const { system, user, context } = committeePrompt({ ...input(["A new head of data joins"]), baseline });
  assertStringIncludes(system, "BASELINE is the same meeting without the what-ifs");
  assertStringIncludes(user, "<<<BASELINE\nOutcome without the what-ifs: Uphill, 20-40%.\n- champion (Head of Data): opened at 1, ended at 2");
  assertEquals(ungrounded("Up from 20-40% before.", context.grounding), "");
  // Without what-ifs a baseline means nothing and is left out.
  const plain = committeePrompt({ ...input(), baseline });
  assert(!plain.user.includes("BASELINE") && !plain.system.includes("BASELINE"));
  // Inline: only read alongside what-ifs.
  assertEquals(readCommitteeRequest({ brief: BRIEF, perspectives: PERSPECTIVES, what_if: ["x"], baseline: CLEAN }).input!.baseline?.seats.length, 5);
  assertEquals(readCommitteeRequest({ brief: BRIEF, perspectives: PERSPECTIVES, baseline: CLEAN }).input!.baseline, undefined);
});

Deno.test("tool schema: run_committee with the five seats and four labels", () => {
  assertEquals(committeeToolSchema.function.name, "run_committee");
  const p = committeeToolSchema.function.parameters.properties;
  assertEquals(p.seats.items.properties.seat.enum, COMMITTEE_SEATS);
  assertEquals(p.outcome.properties.label.enum, ["Likely yes", "Coin flip", "Uphill", "Too early"]);
  assertEquals(committeeToolSchema.function.parameters.required, ["seats", "rounds", "path_to_yes", "main_blocker", "outcome"]);
});

// ─── Saved runs: cache, merge, what-ifs never stored ───

function fakeRun(): (i: CommitteeSimInput) => Promise<CommitteeResult> & { calls?: number } {
  let calls = 0;
  const run = (i: CommitteeSimInput) => {
    calls++;
    run.calls = calls;
    const { context } = committeePrompt(i);
    return Promise.resolve({ ...normalizeCommittee(clone(CLEAN), context), model: "test-model", latencyMs: 1 });
  };
  run.calls = 0;
  return run as never;
}

function fakeStore(row: { brief: unknown; auto_analysis: unknown } | null, failSave = false) {
  const saved: { id: string; committee: CommitteeResult }[] = [];
  const store: CommitteeStore & { row: typeof row; saved: typeof saved } = {
    row,
    saved,
    load: (id) => Promise.resolve(id === REPORT_ID ? store.row : null),
    saveCommittee: (id, committee) => {
      if (failSave) return Promise.reject(new Error("db down"));
      saved.push({ id, committee });
      store.row = { ...store.row!, auto_analysis: withCommittee(store.row!.auto_analysis, committee) };
      return Promise.resolve();
    },
  };
  return store;
}

Deno.test("saved run: the first plain run is stored with generated_at; the next is served cached", async () => {
  const store = fakeStore(clone({ brief: BRIEF, auto_analysis: RUN.auto_analysis }));
  const run = fakeRun() as unknown as ((i: CommitteeSimInput) => Promise<CommitteeResult>) & { calls: number };
  const first = await simulateCommittee({ report_id: REPORT_ID }, store, run);
  assertEquals(run.calls, 1);
  assertEquals(first.cached, undefined);
  assertMatch(first.generated_at!, /^\d{4}-\d{2}-\d{2}T/);
  assertEquals(store.saved.length, 1);
  // Merged, not clobbered: the seven agents' results are still there.
  const analysis = store.row!.auto_analysis as Record<string, unknown>;
  for (const k of ["perspectives", "expansion", "distillation", "synthesis", "timing"]) assert(k in analysis, `lost ${k}`);
  assertEquals((analysis.committee as CommitteeResult).generated_at, first.generated_at);

  const second = await simulateCommittee({ report_id: REPORT_ID }, store, run);
  assertEquals(run.calls, 1); // no model call
  assertEquals(second.cached, true);
  assertEquals(second.outcome, first.outcome);
});

Deno.test("saved run: what-if runs call the model every time, start from the stored run, and are never stored", async () => {
  const store = fakeStore(clone({ brief: BRIEF, auto_analysis: RUN.auto_analysis }));
  const fake = fakeRun() as unknown as (i: CommitteeSimInput) => Promise<CommitteeResult>;
  const inputs: CommitteeSimInput[] = [];
  const run = (i: CommitteeSimInput) => (inputs.push(i), fake(i));
  // No stored run yet: the what-if run has no baseline.
  await simulateCommittee({ report_id: REPORT_ID, what_if: ["A new head of data joins"] }, store, run);
  assertEquals(inputs[0].baseline, undefined);
  assertEquals(store.saved.length, 0);
  await simulateCommittee({ report_id: REPORT_ID }, store, run); // stores the plain run
  const out = await simulateCommittee({ report_id: REPORT_ID, what_if: ["A new head of data joins"] }, store, run);
  assertEquals(inputs[2].baseline?.seats.map((s) => s.stance_end), [2, 0, -2, 1, 0]);
  assertEquals(inputs[2].baseline?.outcome, { label: "Coin flip", low: 35, high: 55 });
  assertEquals(inputs.length, 3); // what-if runs never come from the cache
  assertEquals(out.what_if, ["A new head of data joins"]);
  assertEquals(out.cached, undefined);
  assertEquals(store.saved.length, 1);
  assertEquals((store.row!.auto_analysis as { committee: CommitteeResult }).committee.what_if, undefined);
});

Deno.test("saved run: missing, not an account run, or no critics is a 404", async () => {
  const run = fakeRun() as unknown as (i: CommitteeSimInput) => Promise<CommitteeResult>;
  const missing = await assertRejects(() => simulateCommittee({ report_id: crypto.randomUUID() }, fakeStore(null), run), CommitteeInputError);
  assertEquals((missing as CommitteeInputError).status, 404);
  const idea = await assertRejects(
    () => simulateCommittee({ report_id: REPORT_ID }, fakeStore({ brief: { ...BRIEF, lens: "idea" }, auto_analysis: RUN.auto_analysis }), run),
    CommitteeInputError,
  );
  assertEquals((idea as CommitteeInputError).status, 404);
  const bare = await assertRejects(() => simulateCommittee({ report_id: REPORT_ID }, fakeStore({ brief: BRIEF, auto_analysis: null }), run), CommitteeInputError);
  assertEquals((bare as CommitteeInputError).status, 404);
});

Deno.test("saved run: a failed save still returns the result", async () => {
  const run = fakeRun() as unknown as (i: CommitteeSimInput) => Promise<CommitteeResult>;
  const out = await simulateCommittee({ report_id: REPORT_ID }, fakeStore(clone({ brief: BRIEF, auto_analysis: RUN.auto_analysis }), true), run);
  assertEquals(out.seats.length, 5);
});

Deno.test("inline runs never touch the store", async () => {
  const store = fakeStore(clone({ brief: BRIEF, auto_analysis: RUN.auto_analysis }));
  const run = fakeRun() as unknown as ((i: CommitteeSimInput) => Promise<CommitteeResult>) & { calls: number };
  const out = await simulateCommittee({ brief: BRIEF, perspectives: PERSPECTIVES }, store, run);
  assertEquals(run.calls, 1);
  assertEquals(store.saved.length, 0);
  assertEquals(out.generated_at, undefined);
});

Deno.test("withCommittee keeps every other key and drops cached and what_if", () => {
  const merged = withCommittee({ perspectives: [1], synthesis: { a: 1 }, committee: { old: true } }, {
    cached: true,
    what_if: ["x"],
    model: "m",
  } as unknown as CommitteeResult);
  assertEquals(merged, { perspectives: [1], synthesis: { a: 1 }, committee: { model: "m" } });
});

// ─── Model chain (stubbed fetch, no network) ───

async function withGateway(handler: (url: string, body: Record<string, unknown>) => Response, fn: () => Promise<void>) {
  const realFetch = globalThis.fetch;
  const hadKey = Deno.env.get("LOVABLE_API_KEY");
  Deno.env.set("LOVABLE_API_KEY", "test-key");
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(String(url), JSON.parse(String(init?.body ?? "{}"))))) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    if (hadKey === undefined) Deno.env.delete("LOVABLE_API_KEY");
    else Deno.env.set("LOVABLE_API_KEY", hadKey);
  }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const sanitize = { sanitizeOps: false, sanitizeResources: false }; // AbortSignal.timeout timers outlive the stub

Deno.test({
  name: "model chain: Claude first through the gateway's Messages endpoint, forced to run_committee",
  ...sanitize,
  fn: () =>
    withGateway(
      (url, body) => {
        assertEquals(url, "https://ai.gateway.lovable.dev/v1/messages");
        assertEquals(body.model, "anthropic/claude-sonnet-5");
        assertEquals(body.tool_choice, { type: "tool", name: "run_committee" });
        // Claude sometimes sends a nested array as a JSON string.
        return json({ content: [{ type: "tool_use", name: "run_committee", input: { ...CLEAN, rounds: JSON.stringify(CLEAN.rounds) } }] });
      },
      async () => {
        const out = await runCommittee(input());
        assertEquals(out.model, "anthropic/claude-sonnet-5");
        assertEquals(out.rounds.length, 3);
        assert(out.latencyMs >= 0);
      },
    ),
});

Deno.test({
  name: "model chain: falls back to Flash when Claude fails or answers unusably",
  ...sanitize,
  fn: async () => {
    for (const claude of [json({ error: "overloaded" }, 529), json({ content: [{ type: "tool_use", name: "run_committee", input: { seats: [] } }] })]) {
      const seen: string[] = [];
      await withGateway(
        (url, body) => {
          seen.push(String(body.model));
          if (url.endsWith("/messages")) return claude.clone();
          assertEquals(url, "https://ai.gateway.lovable.dev/v1/chat/completions");
          assertEquals(body.tool_choice, { type: "function", function: { name: "run_committee" } });
          return json({ choices: [{ message: { tool_calls: [{ function: { name: "run_committee", arguments: JSON.stringify(CLEAN) } }] } }] });
        },
        async () => {
          const out = await runCommittee(input());
          assertEquals(out.model, "google/gemini-3-flash-preview");
        },
      );
      assertEquals(seen, ["anthropic/claude-sonnet-5", "google/gemini-3-flash-preview"]);
    }
  },
});

Deno.test({
  name: "model chain: gateway errors keep their status; anything else gets a plain message",
  ...sanitize,
  fn: async () => {
    await withGateway(() => json({ error: "rate limited" }, 429), async () => {
      const e = await assertRejects(() => runCommittee(input()), LLMError);
      assertEquals((e as LLMError).status, 429);
    });
    await withGateway(() => json({ choices: [{ message: { content: "no tool call" } }], content: [] }), async () => {
      await assertRejects(() => runCommittee(input()), Error, "The committee didn't finish");
    });
  },
});

// ─── Evidence-weighted outcome ───

import { evidenceRead, weighOutcome } from "./committee.ts";

const seatsAt = (end: number): CommitteeSeat[] =>
  (["champion", "skeptic", "competitor", "customer", "builder"] as const).map((seat) => ({
    seat,
    role: seat,
    stance_start: 0,
    stance_end: (seat === "competitor" ? 0 : end) as CommitteeSeat["stance_end"],
    influence: 2,
    top_concern: "",
  }) as CommitteeSeat);

Deno.test("weighOutcome: the account's evidence spreads meetings the model scored alike", () => {
  const now = new Date("2026-10-07T00:00:00Z");
  const coin = { label: "Coin flip" as const, low: 35, high: 55, summary: "A coin flip: the CFO wants proof." };
  const strong = weighOutcome(coin, seatsAt(1), evidenceRead({ fit: { grade: "A" }, revenue_model: "2026-08: Agreed to buy a lender [2]." }, now));
  const weak = weighOutcome(coin, seatsAt(0), evidenceRead({ fit: { grade: "C" }, revenue_model: "Date not found: Hiring." }, now));
  assertEquals(strong.label, "Likely yes");
  assertEquals(weak.label, "Uphill");
  // The model's call is kept, and a summary naming the old label is rewritten.
  assertEquals([strong.model_label, strong.model_low, strong.model_high], ["Coin flip", 35, 55]);
  assert(!/coin flip/i.test(weak.summary));
  assertEquals(strong.high - strong.low, 20);
});

Deno.test("weighOutcome: Too early stays the model's call; the list and an unclear motion count", () => {
  const early = { label: "Too early" as const, low: 20, high: 40, summary: "Too thin to call." };
  assertEquals(weighOutcome(early, seatsAt(2), evidenceRead({ fit: { grade: "A" } })).label, "Too early");
  const mid = { label: "Coin flip" as const, low: 40, high: 55, summary: "" };
  const listed = weighOutcome(mid, seatsAt(0), evidenceRead({ fit: { grade: "B" }, customer_list: { on_list: true } }));
  const unclear = weighOutcome(mid, seatsAt(0), evidenceRead({ fit: { grade: "B" }, motion: { label: "Unclear" } }));
  assert(listed.low > unclear.low);
});

Deno.test("simulateCommittee: rescore re-weighs a stored meeting without a model call, the same every time", async () => {
  let saved: CommitteeResult | undefined;
  const brief = { lens: "account", company: "Acme", fit: { grade: "A" }, revenue_model: `${new Date().toISOString().slice(0, 7)}: Raised a round [1].` };
  const stored = {
    seats: seatsAt(1),
    rounds: [{ title: "Open", turns: [{ seat: "champion", says: "Yes.", stance_after: 1 }] }],
    path_to_yes: [],
    main_blocker: { seat: "skeptic", why: "Budget timing.", what_would_flip_it: "" },
    outcome: { label: "Coin flip", low: 35, high: 55, summary: "Coin flip." },
    model: "m",
    latencyMs: 1,
  };
  const store = {
    load: () => Promise.resolve({ brief, auto_analysis: { perspectives: [{ persona: "champion", headline: "h", perspective: "p", challenge_questions: [] }], committee: saved ?? stored } }),
    saveCommittee: (_id: string, c: CommitteeResult) => {
      saved = c;
      return Promise.resolve();
    },
  };
  const never = () => Promise.reject(new Error("no model call"));
  const id = "9c769b0b-8282-4c6d-91d7-c59b1bae8ca5";
  const first = await simulateCommittee({ report_id: id, rescore: true }, store as never, never);
  const second = await simulateCommittee({ report_id: id, rescore: true }, store as never, never);
  assertEquals(first.outcome.label, "Likely yes");
  assertEquals(second.outcome, first.outcome);
  assertEquals(saved?.outcome.model_label, "Coin flip");
});
