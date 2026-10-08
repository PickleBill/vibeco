// Unit tests for the partnership riff: input, the profile pick, sources (stubbed
// searches, no network), the checks on the model's brief, the cache and the
// model chain (stubbed gateway).
// Run: deno test --allow-env --no-lock supabase/functions/_shared/agents/partner-riff_test.ts
import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { ExaCompany, ExaPage } from "../exa.ts";
import { OMNI } from "../sellers/omni.ts";
import type { StackScan } from "../stack-scan.ts";
import type { PartnerRiffResult } from "../types.ts";
import {
  checkRiff,
  dropUnsourced,
  gatherRiffSources,
  knownNumbers,
  partnerRiff,
  pickProfile,
  readRange,
  readRiffInput,
  RIFF_CHECKS,
  RiffInputError,
  riffStore,
  type RiffDeps,
  type RiffStore,
  SELLER_PLACEHOLDERS,
  tidy,
  usable,
} from "./partner-riff.ts";

const profile = (name: string, domain: string, extra: Partial<ExaCompany> = {}): ExaCompany => ({
  name,
  url: `https://${domain}/`,
  domain,
  hq: "Atlanta, GA",
  employees: 120,
  about: `${name} prints and ships custom products for 40,000 merchants.`,
  tools: ["Snowflake", "Looker"],
  ...extra,
});
const page = (title: string, url: string, text: string): ExaPage => ({ title, url, domain: new URL(url).hostname.replace(/^www\./, ""), text });
const noScan: StackScan = { found: false, total_jobs: 0, scanned_jobs: 0, tools: [], posts: [], ms: 0, tried: [] };

Deno.test("readRiffInput: a name, a domain or both; a bare domain names itself; empty is an error", () => {
  assertEquals(readRiffInput({ company: "Dreamship (dreamship.com)" }).company, "Dreamship (dreamship.com)");
  const bare = readRiffInput({ company: "https://www.dreamship.com/" });
  assertEquals([bare.name, bare.domain, bare.company], ["Dreamship", "dreamship.com", "Dreamship (dreamship.com)"]);
  const named = readRiffInput({ company: "  Blob   Depot " });
  assertEquals([named.name, named.domain, named.fresh], ["Blob Depot", undefined, false]);
  assertEquals(readRiffInput({ company: "Acme", fresh: true }).fresh, true);
  assertThrows(() => readRiffInput({ company: "  " }), RiffInputError);
  assertThrows(() => readRiffInput({ company: "Acme", seller: "nobody" }), RiffInputError);
});

Deno.test("pickProfile: the company on its domain, else the one with its name; never a lookalike", () => {
  const found = [profile("Printful", "printful.com"), profile("Dreamship", "dreamship.com")];
  assertEquals(pickProfile(found, "Dreamship", "dreamship.com")?.domain, "dreamship.com");
  assertEquals(pickProfile(found, "dreamship")?.domain, "dreamship.com");
  assertEquals(pickProfile(found, "Gooten"), undefined);
  assertEquals(pickProfile(found, "Dreamship", "dreamship.io"), undefined);
});

Deno.test("gatherRiffSources: the profile first, then its own pages (off-site pages out), then its job posts; numbered", async () => {
  const deps: RiffDeps = {
    companies: () => Promise.resolve([profile("Dreamship", "dreamship.com")]),
    pages: () =>
      Promise.resolve([
        page("Merchant dashboard", "https://help.dreamship.com/dashboard", "Merchants see orders, returns and delivery times in the dashboard."),
        page("Best POD platforms", "https://reviews.example.com/pod", "Dreamship and others compared."),
      ]),
    scan: () => Promise.reject(new Error("no board")),
  };
  const r = await gatherRiffSources({ name: "Dreamship", domain: "dreamship.com" }, deps);
  assertEquals(
    r.sources.map((s) => [s.id, s.kind, s.url]),
    [
      [1, "company", "https://dreamship.com/"],
      [2, "site", "https://help.dreamship.com/dashboard"],
    ],
  );
  assert(r.texts[1].includes("Employs 120 people."));
  assert(r.texts[1].includes("Tech stack its company data lists: Snowflake, Looker."));
  // Nothing answers: no sources, and no throw.
  const none = await gatherRiffSources({ name: "Nobody" }, { companies: () => Promise.reject(new Error("x")), pages: () => Promise.reject(new Error("x")), scan: () => Promise.resolve(noScan) });
  assertEquals(none.sources, []);
});

Deno.test("tidy, readRange and number checks", () => {
  assertEquals(tidy("A **bold** idea — with a dash – twice"), "A bold idea, with a dash, twice");
  assertEquals(readRange(["300", 50], { min: 1, max: 100, def: [5, 20] }), [50, 100]);
  assertEquals(readRange("junk", { min: 1, max: 100, def: [5, 20] }), [5, 20]);
  assertEquals(readRange([2.25, 7], { min: 1, max: 100, def: [5, 20] }), [2.3, 7]);
  assertEquals(readRange([1, 1], { min: 1, max: 100, def: [5, 20] }), [5, 20]); // a placeholder of nothing
  const known = knownNumbers(["Serves 40,000 merchants.", "Launched in 4 months to 30,000+ people."]);
  assertEquals(dropUnsourced("Serves 40K merchants. Grew 300% last year. Launch in 4 months.", known), "Serves 40K merchants. Launch in 4 months.");
  // Small bare counts read as words and pass.
  assertEquals(dropUnsourced("Two or 3 places in the product.", known), "Two or 3 places in the product.");
});

const research = {
  sources: [
    { id: 1, title: "Dreamship: company profile", url: "https://dreamship.com/", kind: "company" as const, snippet: "" },
    { id: 2, title: "Merchant dashboard", url: "https://help.dreamship.com/dashboard", kind: "site" as const, snippet: "" },
  ],
  texts: {
    1: "Dreamship prints and ships custom products for 40,000 merchants. Employs 120 people. Tech stack its company data lists: Snowflake, Looker.",
    2: "Merchants see orders, returns and delivery times in the Dreamship dashboard, built on Metabase. Data syncs from Shopify.",
  },
  profile: profile("Dreamship", "dreamship.com"),
  scan: undefined,
};

const modelRiff = {
  headline: "Turn the merchant dashboard into a paid insights tier — powered by Omni.",
  confidence: "high",
  embedded_fit: { verdict: "strong", why: "Merchants already open the dashboard daily." },
  situation: [
    { claim: "Prints and ships custom products for 40,000 merchants.", basis: "known", sources: [1] },
    { claim: "Revenue is about $80M.", basis: "known", sources: [1] },
    { claim: "Sells mostly to Shopify stores.", basis: "known", sources: [] },
  ],
  embedded_opportunity: [
    { surface: "Merchant dashboard", end_customer_sees: "Return rate and delivery time by product.", metrics: ["Return rate", "Top 10 SKUs"] },
    { surface: "Order page", end_customer_sees: "Repeat-buyer value.", metrics: ["Repeat buyers"] },
  ],
  integration: {
    stack: [
      { tool: "Metabase", sources: [2] },
      { tool: "Snowflake", sources: [1] },
      { tool: "Kafka", sources: [2] },
    ],
    incumbent: { name: "Metabase", sources: [2] },
    omni_fit: "One semantic model across every merchant, with permissions per merchant.",
  },
  gtm: {
    pricing_shape: "platform_plus_per_customer",
    monetization: ["A paid Insights tier", "Charge 15% more on Pro"],
    assumptions: { end_customers: [40000, 10000], premium_adoption_pct: [3, 150], premium_price_per_customer_month: ["$19", "$49"], seats_per_customer: [1, 3] },
    notes: { end_customers: "Source 1 says 40,000 merchants." },
  },
  swot: {
    strengths: ["Daily dashboard habit", "Order data already per merchant", "A third strength"],
    weaknesses: ["Metabase is free", "Small data team"],
    opportunities: ["Paid tier", "Upsell 25% of merchants"],
    threats: ["Shopify analytics", "Printful"],
  },
  internal_play: "Ops could watch print-partner delays on the same model.",
  next_move: { who: "VP of Product", first_question: "Which merchant question does support answer by hand every week?" },
};

Deno.test("checkRiff: known needs a source that holds it; invented numbers go; stack needs a naming source; prices are placeholders", () => {
  const r = checkRiff(modelRiff, research, { name: "Dreamship", seller: OMNI });
  assertEquals(r.headline, "Turn the merchant dashboard into a paid insights tier, powered by Omni.");
  assertEquals(
    r.situation.map((s) => [s.claim, s.basis]),
    [
      ["Prints and ships custom products for 40,000 merchants.", "known"],
      ["Sells mostly to Shopify stores.", "inferred"],
    ],
  );
  // Metabase is named on its own help page: Confirmed. Snowflake only in the third-party profile: Inferred. Kafka nowhere: out.
  assertEquals(
    r.integration.stack.map((s) => [s.tool, s.status]),
    [
      ["Metabase", "Confirmed"],
      ["Snowflake", "Inferred"],
    ],
  );
  assertEquals(r.integration.incumbent, { name: "Metabase", status: "Confirmed", sources: [2] });
  assertEquals(r.embedded_opportunity[0].metrics, ["Return rate", "Top SKUs"]);
  assertEquals(r.gtm.assumptions.end_customers, [10000, 40000]);
  assertEquals(r.gtm.assumptions.premium_adoption_pct, [3, 100]);
  assertEquals(r.gtm.assumptions.premium_price_per_customer_month, [19, 49]);
  assertEquals(r.gtm.assumptions.omni_platform_fee_year, SELLER_PLACEHOLDERS.omni_platform_fee_year);
  assertEquals(r.gtm.notes.omni_platform_fee_year, "Placeholder, not Omni's price list. Edit it.");
  assertEquals(r.gtm.notes.premium_adoption_pct, "Placeholder. Edit it.");
  assertEquals(r.gtm.monetization, ["A paid Insights tier"]);
  assertEquals(r.swot.strengths.length, 2);
  assertEquals(r.swot.opportunities, ["Paid tier"]);
  assertEquals(r.confidence, "medium"); // two sources cap it
  assertEquals(r.grounding, "sources");
});

Deno.test("checkRiff: a seller proof point keeps its own numbers; a claim about tools is known only when its own pages confirm each one", () => {
  const raw = {
    ...modelRiff,
    situation: [
      { claim: "Its dashboard runs on Metabase.", basis: "known", sources: [2] },
      { claim: "It runs Snowflake and Looker.", basis: "known", sources: [1] },
      { claim: "Its dashboard runs on Metabase, with Snowflake underneath.", basis: "known", sources: [1, 2] },
    ],
    swot: {
      ...modelRiff.swot,
      opportunities: ["Could cut the 4 to 6 month build cycles seen in BambooHR and Standard Metrics launches.", "A paid tier, like the one BambooHR launched in 4 months."],
    },
    gtm: { ...modelRiff.gtm, monetization: ["An Elite tier like BambooHR's, for 30,000+ people at launch", "Standard Metrics shipped in 4 months"] },
  };
  // A 6 in the sources doesn't make it a proof point.
  const withSix = { ...research, texts: { ...research.texts, 2: `${research.texts[2]} Refunds post within 6 months.` } };
  const r = checkRiff(raw, withSix, { name: "Dreamship", seller: OMNI });
  assertEquals(
    r.situation.map((s) => s.basis),
    ["known", "inferred", "inferred"],
  );
  assertEquals(r.swot.opportunities, ["A paid tier, like the one BambooHR launched in 4 months."]);
  assertEquals(r.gtm.monetization, ["An Elite tier like BambooHR's, for 30,000+ people at launch"]);
});

Deno.test("checkRiff: no sources is low confidence and model knowledge; not a fit keeps one surface and the internal play", () => {
  const r = checkRiff(
    { ...modelRiff, embedded_fit: { verdict: "not_a_fit", why: "No customer data in the product." } },
    { sources: [], texts: {}, profile: undefined, scan: undefined },
    { name: "Dreamship", seller: OMNI },
  );
  assertEquals([r.confidence, r.grounding, r.embedded_fit.verdict], ["low", "model-knowledge", "not_a_fit"]);
  assertEquals(r.embedded_opportunity.length, 1);
  assertEquals(r.internal_play, "Ops could watch print-partner delays on the same model.");
  assertEquals(r.integration.stack, []);
  assertEquals(r.situation.map((s) => s.basis), ["inferred"]); // the 40,000 and $80M claims have no source left
});

const sanitize = { sanitizeOps: false, sanitizeResources: false }; // AbortSignal.timeout timers outlive the stub
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function withGateway(handler: (url: string, body: Record<string, unknown>) => Response, fn: () => Promise<void>) {
  const realFetch = globalThis.fetch;
  const hadKey = Deno.env.get("LOVABLE_API_KEY");
  Deno.env.set("LOVABLE_API_KEY", "test-key");
  globalThis.fetch = ((url: string | URL | Request, init?: RequestInit) => Promise.resolve(handler(String(url), JSON.parse(String(init?.body ?? "{}"))))) as typeof fetch;
  try {
    await fn();
  } finally {
    globalThis.fetch = realFetch;
    if (hadKey === undefined) Deno.env.delete("LOVABLE_API_KEY");
    else Deno.env.set("LOVABLE_API_KEY", hadKey);
  }
}

const deps: RiffDeps = {
  companies: () => Promise.resolve([profile("Dreamship", "dreamship.com")]),
  pages: () => Promise.resolve([page("Merchant dashboard", "https://help.dreamship.com/dashboard", research.texts[2])]),
  scan: () => Promise.resolve(noScan),
};

function memoryStore(seed?: PartnerRiffResult): RiffStore & { saved: string[] } {
  const saved: string[] = [];
  return {
    saved,
    find: (key) => Promise.resolve(seed && key === "dreamship.com" ? { id: "r1", savedAt: "2026-10-08T12:00:00Z", result: seed } : null),
    save: (key) => {
      saved.push(key);
      return Promise.resolve("r2");
    },
  };
}

Deno.test({
  name: "partnerRiff: a saved riff comes back without a model call; otherwise Claude, saved; Flash when Claude fails",
  ...sanitize,
  fn: async () => {
    const calls: string[] = [];
    const answer = (url: string, body: Record<string, unknown>) => {
      calls.push(String(body.model));
      if (String(body.model).startsWith("anthropic/")) {
        if (calls.length > 2) return json({ error: { message: "overloaded" } }, 529);
        return json({ content: [{ type: "tool_use", name: "write_partner_riff", input: modelRiff }] });
      }
      return json({ choices: [{ message: { tool_calls: [{ function: { name: "write_partner_riff", arguments: JSON.stringify(modelRiff) } }] } }] });
    };
    await withGateway(answer, async () => {
      const input = readRiffInput({ company: "Dreamship (dreamship.com)" });
      const fresh = await partnerRiff(input, memoryStore(), deps);
      assertEquals([fresh.model, fresh.reportId, fresh.cached], ["anthropic/claude-sonnet-5", "r2", undefined]);
      assertEquals(fresh.sources.length, 2);
      assertEquals(fresh.riff.integration.stack[0], { tool: "Metabase", status: "Confirmed", sources: [2] });

      const before = calls.length;
      const hit = await partnerRiff(input, memoryStore(fresh), deps);
      assertEquals([hit.cached, hit.reportId, calls.length], [true, "r1", before]);

      // Claude overloaded on the next fresh run: Flash answers.
      calls.push("x");
      const fallback = await partnerRiff({ ...input, fresh: true }, memoryStore(fresh), deps);
      assertEquals(fallback.model, "google/gemini-3-flash-preview");
    });
  },
});

Deno.test("checkRiff reads nested parts a model sent as JSON strings; an empty brief isn't usable", () => {
  const stringly = {
    ...modelRiff,
    embedded_fit: JSON.stringify(modelRiff.embedded_fit),
    integration: JSON.stringify(modelRiff.integration),
    gtm: JSON.stringify(modelRiff.gtm),
    swot: JSON.stringify(modelRiff.swot),
    embedded_opportunity: JSON.stringify(modelRiff.embedded_opportunity),
  };
  const r = checkRiff(stringly, research, { name: "Dreamship", seller: OMNI });
  assertEquals([r.embedded_fit.verdict, r.integration.stack.length, r.embedded_opportunity.length, r.swot.threats.length], ["strong", 2, 2, 2]);
  assert(usable(r));
  const empty = checkRiff({ headline: "Give its 40,000 merchants analytics." }, research, { name: "Dreamship", seller: OMNI });
  assert(!usable(empty));
  const pivot = checkRiff({ ...modelRiff, embedded_fit: { verdict: "not_a_fit", why: "No product." }, internal_play: null }, research, { name: "Dreamship", seller: OMNI });
  assert(!usable(pivot)); // not a fit needs the internal play
});

Deno.test({
  name: "partnerRiff: an empty brief from Claude falls through to Flash and isn't saved as Claude's",
  ...sanitize,
  fn: async () => {
    const answer = (_url: string, body: Record<string, unknown>) =>
      String(body.model).startsWith("anthropic/")
        ? json({ content: [{ type: "tool_use", name: "write_partner_riff", input: { headline: "Give its merchants analytics." } }] })
        : json({ choices: [{ message: { tool_calls: [{ function: { name: "write_partner_riff", arguments: JSON.stringify(modelRiff) } }] } }] });
    await withGateway(answer, async () => {
      const store = memoryStore();
      const out = await partnerRiff(readRiffInput({ company: "Dreamship (dreamship.com)" }), store, deps);
      assertEquals(out.model, "google/gemini-3-flash-preview");
      assert(usable(out.riff));
      assertEquals(store.saved, ["dreamship.com"]);
    });
  },
});

Deno.test("riffStore: finds only riffs saved under the current checks, and saves the version with the riff", async () => {
  const calls: unknown[][] = [];
  const db: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "gte", "order", "limit", "insert"]) {
    db[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return db;
    };
  }
  db.maybeSingle = () => Promise.resolve({ data: null, error: null });
  db.single = () => Promise.resolve({ data: { id: "r9" }, error: null });
  const store = riffStore(db);
  assertEquals(await store.find("dreamship.com", "2026-10-01T00:00:00Z"), null);
  assert(calls.some((c) => c[0] === "eq" && c[1] === "brief->>checks" && c[2] === RIFF_CHECKS));
  assertEquals(await store.save("dreamship.com", "Dreamship", { riff: {}, sources: [] } as unknown as PartnerRiffResult), "r9");
  const row = calls.find((c) => c[0] === "insert")?.[1] as { brief: { lens: string; key: string; checks: string } };
  assertEquals([row.brief.lens, row.brief.key, row.brief.checks], ["partner", "dreamship.com", RIFF_CHECKS]);
});
