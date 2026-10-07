// Unit tests for the suggestion checks: input bounds, exclude, dedupe, the
// digit and claim filters, the domain check (injected, so no network) and the cap.
// Run: deno test --allow-env --no-lock supabase/functions/_shared/agents/suggest-accounts_test.ts
import { assert, assertEquals, assertStringIncludes, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { LLMError } from "../error-handler.ts";
import type { SuggestAccountsInput } from "../types.ts";
import {
  bareDomain,
  cleanSuggestions,
  excludeKeys,
  readSuggestInput,
  suggestAccounts,
  SuggestInputError,
  suggestPrompt,
  verifySuggestions,
} from "./suggest-accounts.ts";

const input: SuggestAccountsInput = {
  seed: { name: "Relay", domain: "relaypro.com", motion: "Embedded", line: "Ships a safety platform for frontline teams.", tools: ["Snowflake", "dbt"] },
  exclude: ["Agilysys (agilysys.com)", "Equifax", "avidxchange.com"],
  region: "Southeast US",
  count: 3,
};

const s = (name: string, domain: string, why = "May ship customer-facing reporting in its product.", extra: Record<string, unknown> = {}) => ({
  name,
  domain,
  hq: "Atlanta, GA",
  why,
  motion_guess: "Embedded",
  ...extra,
});

Deno.test("readSuggestInput: defaults, bounds and a required seed name", () => {
  const read = readSuggestInput({ seed: { name: "  Relay ", domain: "https://www.RelayPro.com/", motion: "Sideways", tools: ["Snowflake", 3, ""] }, count: 40 });
  assertEquals(read.seed.name, "Relay");
  assertEquals(read.seed.domain, "relaypro.com");
  assertEquals(read.seed.motion, "Unclear");
  assertEquals(read.seed.tools, ["Snowflake"]);
  assertEquals(read.region, "Southeast US");
  assertEquals(read.count, 8);
  assertEquals(readSuggestInput({ seed: { name: "Relay" } }).count, 6);
  assertThrows(() => readSuggestInput({ seed: {} }), SuggestInputError);
  assertThrows(() => readSuggestInput({ seed: { name: "Relay" }, exclude: "Equifax" }), SuggestInputError);
});

Deno.test("bareDomain: plain hosts only", () => {
  assertEquals(bareDomain("https://www.Example.com/"), "example.com");
  assertEquals(bareDomain("shop.example.co.uk"), "shop.example.co.uk");
  assertEquals(bareDomain("example.com/about"), "");
  assertEquals(bareDomain("not a domain"), "");
  assertEquals(bareDomain("10.0.0.1"), "");
  assertEquals(bareDomain(42), "");
});

Deno.test("excludeKeys: typed, bare names and bare domains, plus the seed", () => {
  const { names, domains } = excludeKeys(input.exclude, input.seed);
  assert(names.has("agilysys") && names.has("equifax") && names.has("relay"));
  assert(domains.has("agilysys.com") && domains.has("avidxchange.com") && domains.has("relaypro.com"));
});

Deno.test("cleanSuggestions: drops the territory, the seed, repeats, bad domains and unchecked claims", () => {
  const out = cleanSuggestions(
    {
      suggestions: [
        s("Agilysys Inc.", "agilysys-hospitality.com"), // excluded by name (legal suffix ignored)
        s("AvidX", "www.AvidXchange.com"), // excluded by domain
        s("Relay", "relay.io"), // the seed
        s("Cardlytics", "cardlytics.com"),
        s("Cardlytics, Inc.", "cardlytics.co"), // same name
        s("Card Co", "https://cardlytics.com/"), // same domain
        s("Bad Domain", "cardlytics.com/about"),
        s("Profile Only", "linkedin.com"),
        s("Dated", "dated.com", "May have added reporting in 2025."),
        s("Funded", "funded.com", "May be building reporting after it raised a big round."),
        s("Empty Why", "emptywhy.com", "  "),
        s("Greenlight", "greenlight.com", "Might run a data team on a warehouse.", { motion_guess: "Sideways", hq: "Suite 400, Atlanta" }),
      ],
    },
    input,
  );
  assertEquals(
    out.map((x) => x.name),
    ["Cardlytics", "Greenlight"],
  );
  assertEquals(out[0], { name: "Cardlytics", domain: "cardlytics.com", hq: "Atlanta, GA", why: "May ship customer-facing reporting in its product.", motion_guess: "Embedded" });
  // An unknown motion falls back to the seed's; an address-like hq is dropped.
  assertEquals(out[1].motion_guess, "Embedded");
  assertEquals(out[1].hq, undefined);
});

Deno.test("cleanSuggestions: a list sent as a JSON string, and junk", () => {
  assertEquals(cleanSuggestions({ suggestions: JSON.stringify([s("Cardlytics", "cardlytics.com")]) }, input).length, 1);
  assertEquals(cleanSuggestions({ suggestions: "none" }, input), []);
  assertEquals(cleanSuggestions(null, input), []);
  assertEquals(cleanSuggestions({ suggestions: [null, 3, { name: "No domain", why: "May." }] }, input), []);
});

Deno.test("verifySuggestions: keeps domains that answer, in order, capped at count", async () => {
  const items = cleanSuggestions({ suggestions: ["one", "two", "three", "four", "five"].map((n) => s(n, `${n}.com`)) }, input);
  const checked: string[] = [];
  const out = await verifySuggestions(items, 3, (domain) => {
    checked.push(domain);
    if (domain === "four.com") return Promise.reject(new Error("boom"));
    return Promise.resolve(domain !== "two.com");
  });
  assertEquals(checked.length, 5); // every candidate checked, in parallel
  assertEquals(
    out.map((x) => x.domain),
    ["one.com", "three.com", "five.com"],
  );
  assertEquals((await verifySuggestions(items, 8, () => Promise.resolve(false))).length, 0);
});

Deno.test("suggestPrompt: region, motion, exclude and the hypothesis rule", () => {
  const { system, user } = suggestPrompt(input);
  assertStringIncludes(system, "Southeast US");
  assertStringIncludes(system, "customer-facing dashboards");
  assertStringIncludes(system, "hypothesis");
  assertStringIncludes(system, "up to 7 companies");
  assertStringIncludes(user, "Agilysys (agilysys.com)");
  assertStringIncludes(user, "Snowflake, dbt");
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
const always = () => Promise.resolve(true);

Deno.test({
  name: "suggestAccounts: Claude first; Flash when Claude names only excluded companies; empty list when nothing survives",
  ...sanitize,
  fn: async () => {
    const seen: string[] = [];
    await withGateway(
      (url, body) => {
        seen.push(String(body.model));
        if (url.endsWith("/messages")) {
          assertEquals(body.tool_choice, { type: "tool", name: "suggest_accounts" });
          return json({ content: [{ type: "tool_use", name: "suggest_accounts", input: { suggestions: [s("Equifax", "equifax.com")] } }] });
        }
        const args = JSON.stringify({ suggestions: [s("Cardlytics", "cardlytics.com")] });
        return json({ choices: [{ message: { tool_calls: [{ function: { name: "suggest_accounts", arguments: args } }] } }] });
      },
      async () => {
        const out = await suggestAccounts(input, always);
        assertEquals(out.model, "google/gemini-3-flash-preview");
        assertEquals(
          out.suggestions.map((x) => x.name),
          ["Cardlytics"],
        );
      },
    );
    assertEquals(seen, ["anthropic/claude-sonnet-5", "google/gemini-3-flash-preview"]);

    await withGateway(
      () => json({ content: [{ type: "tool_use", name: "suggest_accounts", input: { suggestions: [s("Cardlytics", "cardlytics.com")] } }] }),
      async () => {
        const out = await suggestAccounts(input, () => Promise.resolve(false));
        assertEquals(out.model, "anthropic/claude-sonnet-5");
        assertEquals(out.suggestions, []);
      },
    );
  },
});

Deno.test({
  name: "suggestAccounts: gateway errors keep their status",
  ...sanitize,
  fn: () =>
    withGateway(
      () => json({ error: "rate limited" }, 429),
      async () => {
        const err = await suggestAccounts(input, always).catch((e) => e);
        assert(err instanceof LLMError);
        assertEquals(err.status, 429);
      },
    ),
});
