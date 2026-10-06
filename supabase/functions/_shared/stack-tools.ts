// Data-stack products the account lens looks for in a company's own job posts,
// by stack category. Patterns are word-bounded; tools whose names are also
// everyday words (Spark, Sigma, Mode, Hex, Bedrock) need the product's casing
// or a nearby BI tool, so "spark curiosity" or "Six Sigma" don't count.

export type StackCategory = "Warehouse" | "Transformation" | "BI tools" | "AI" | "Embedded analytics";

export interface StackTool {
  name: string;
  category: StackCategory;
  re: RegExp;
  /** A signal of in-product analytics ("customer-facing dashboards"), not a product: it feeds the motion, never a stack line. */
  signal?: true;
}

// Names that are also everyday words count only next to another data tool in a list.
const NEIGHBOR =
  "(?:Looker|Tableau|Power ?BI|Mode|Hex|Sigma|Omni|Metabase|ThoughtSpot|Periscope|Superset|Jupyter|dbt|Snowflake|BigQuery|Databricks|Redshift|Fivetran|Airflow|ClickHouse|Postgres(?:QL)?)";
const LIST = "\\s*(?:,|/|\\bor\\b|\\band\\b)\\s*";
const listed = (word: string, extra = "") =>
  new RegExp(`${extra}\\b${word}\\b(?=${LIST}${NEIGHBOR}\\b)|\\b${NEIGHBOR}${LIST}${word}\\b`);

const tool = (name: string, category: StackCategory, re: RegExp): StackTool => ({ name, category, re });

/**
 * Analytics shipped to the company's own customers: "embedded analytics",
 * "customer-facing dashboards", "in-product reporting", "white-labeled analytics".
 */
export const EMBEDDED_PHRASE =
  /\bembedded (?:analytics|dashboards?|BI|reporting|reports)\b|\b(?:customer|client|user|partner|merchant)[- ]facing (?:analytics|dashboards?|reporting|reports|insights|data products?)\b|\bin-product (?:analytics|reporting|reports|dashboards?|insights)\b|\bwhite[- ]?label(?:ed|led)? (?:analytics|dashboards?|reporting|reports|BI)\b/i;

export const STACK_TOOLS: StackTool[] = [
  // Warehouses, lakehouses and query engines
  tool("Snowflake", "Warehouse", /\bSnowflake\b/),
  tool("BigQuery", "Warehouse", /\bBig\s?Query\b/i),
  tool("Databricks", "Warehouse", /\bDatabricks\b/i),
  tool("Amazon Redshift", "Warehouse", /\bRedshift\b/i),
  tool("PostgreSQL", "Warehouse", /\bPostgres(?:QL)?\b/i),
  tool("ClickHouse", "Warehouse", /\bClickHouse\b/i),
  tool("Azure Synapse", "Warehouse", /\bAzure Synapse\b|\bSynapse Analytics\b/i),
  tool("Microsoft Fabric", "Warehouse", /\bMicrosoft Fabric\b/i),
  tool("Teradata", "Warehouse", /\bTeradata\b/i),
  tool("Trino", "Warehouse", /\bTrino\b/),
  tool("Starburst", "Warehouse", /\bStarburst\b/),
  tool("Presto", "Warehouse", /\bPresto(?:DB)?\b/),

  // Transformation, ingestion and orchestration
  tool("dbt", "Transformation", /\bdbt\b/i),
  tool("Fivetran", "Transformation", /\bFivetran\b/i),
  tool("Airflow", "Transformation", /\bAirflow\b/i),
  tool("Dagster", "Transformation", /\bDagster\b/i),
  tool("Prefect", "Transformation", /\bPrefect\b/),
  tool("Apache Spark", "Transformation", /\bSpark\b|\bPySpark\b/),
  // Streaming (Kafka, Flink, Kinesis) moves events; it isn't a stack line for an analytics seller.
  tool("Airbyte", "Transformation", /\bAirbyte\b/i),
  tool("Informatica", "Transformation", /\bInformatica\b/i),
  tool("Matillion", "Transformation", /\bMatillion\b/i),
  tool("AWS Glue", "Transformation", /\bAWS Glue\b|\bGlue\b(?=\s+(?:jobs?|ETL|catalog|crawlers?))/),
  tool("Hightouch", "Transformation", /\bHightouch\b/i),

  // BI and dashboards
  tool("Tableau", "BI tools", /\bTableau\b/i),
  tool("Power BI", "BI tools", /\bPower\s?BI\b/i),
  tool("Looker", "BI tools", /\bLooker\b(?!\s*Studio)/),
  tool("Looker Studio", "BI tools", /\bLooker Studio\b|\bData Studio\b/),
  tool("Sigma Computing", "BI tools", /\bSigma Computing\b|(?<![Ss]ix[\s-])\bSigma\b(?!\s*(?:Xi|Chi|Delta|Phi|Kappa|Nu|Pi))/),
  tool("Mode", "BI tools", listed("Mode", "\\bMode Analytics\\b|")),
  tool("Hex", "BI tools", listed("Hex", "\\bhex\\.tech\\b|")),
  tool("ThoughtSpot", "BI tools", /\bThoughtSpot\b/i),
  tool("Metabase", "BI tools", /\bMetabase\b/i),
  tool("Qlik", "BI tools", /\bQlik(?:View|\s?Sense)?\b/i),
  tool("MicroStrategy", "BI tools", /\bMicroStrategy\b/i),
  tool("Domo", "BI tools", /\bDomo\b/),
  tool("Apache Superset", "BI tools", /\bSuperset\b/),
  tool("Omni", "BI tools", listed("Omni", "\\bOmni Analytics\\b|\\bomni\\.co\\b|")),

  // AI and ML platforms
  tool("OpenAI", "AI", /(?<!Azure\s)\bOpenAI\b|\bChatGPT\b/),
  tool("Azure OpenAI", "AI", /\bAzure OpenAI\b/i),
  // Models used in the product or for analysis; coding assistants (Claude Code, Cursor) aren't the data stack.
  tool("Anthropic Claude", "AI", /\bAnthropic\b|\bClaude\b(?!\s*Code)(?=[\s,.)]*(?:API|models?|Sonnet|Opus|Haiku|for data|\d))/),
  tool("Vertex AI", "AI", /\bVertex\s?AI\b/i),
  tool("Amazon SageMaker", "AI", /\bSage[Mm]aker\b/),
  tool("Amazon Bedrock", "AI", /\bBedrock\b/),
  tool("Snowflake Cortex", "AI", /\bSnowflake Cortex\b|\bCortex (?:AI|Analyst|Search)\b/),
  tool("MLflow", "AI", /\bMLflow\b/i),
  tool("LangChain", "AI", /\bLangChain\b/i),
  tool("Hugging Face", "AI", /\bHugging\s?Face\b/i),

  // Embedded analytics: analytics the company ships inside its own product.
  { ...tool("Customer-facing analytics", "Embedded analytics", EMBEDDED_PHRASE), signal: true },
  tool("Looker Embedded", "Embedded analytics", /\bLooker (?:Embedded|embed(?:ded)? analytics|Powered)\b|\bembedded Looker\b/i),
  tool("Tableau Embedded", "Embedded analytics", /\bTableau Embedded\b|\bTableau embedded analytics\b|\bembedded Tableau\b/i),
  tool("Power BI Embedded", "Embedded analytics", /\bPower\s?BI Embedded\b|\bembedded Power\s?BI\b/i),
  tool("Metabase Embedded", "Embedded analytics", /\bMetabase (?:Embedded|embedding)\b|\bembedded Metabase\b/i),
  tool("Sisense", "Embedded analytics", /\bSisense\b/i),
  tool("GoodData", "Embedded analytics", /\bGoodData\b/i),
  tool("Qrvey", "Embedded analytics", /\bQrvey\b/i),
  tool("Luzmo", "Embedded analytics", /\bLuzmo\b|\bCumul\.io\b/i),
  tool("Cube", "Embedded analytics", listed("Cube", "\\bCube\\.(?:dev|js)\\b|\\bCube Cloud\\b|\\bCube semantic layer\\b|")),
];

/** A role that builds analytics for the company's customers ("Data Product Manager", "Product Manager, Reporting"). */
export const EMBEDDED_ROLE =
  /\bdata products? manager\b|\bproduct manager\b[^|]{0,24}\b(?:analytics|reporting|insights|dashboards?)\b|\b(?:analytics|reporting|insights) product manager\b/i;

// A tool offered as one option among several, or as a nice-to-have, isn't
// evidence the company runs it. Hedges:
//   lead-ins that cover the rest of the sentence ("such as AWS (Redshift), GCP
//   (BigQuery)", "e.g. Looker, Tableau", "preferably Snowflake", "after
//   evaluating Sigma and Hex"), and
//   alternatives inside the tool's own clause ("Snowflake, BigQuery, or
//   Redshift", "dbt / Omni / Hex or equivalents", "Snowflake, Postgres, etc."), and
//   a list of three or more in parentheses ("platforms (Airflow, Dagster,
//   Prefect, Metaflow)") unless the sentence says the company runs them, and
//   a plus anywhere in the sentence ("Experience with Looker is a plus"), and
//   a nice-to-have lead-in or section ("Bonus Experience: ...", "Preferred Qualifications").
const LEAD_HEDGE =
  /\b(?:e\.g|eg|such as|for example|for instance|like|preferabl[ey]|ideally|any (?:of|modern|major|other)|one or more|at least one|including but not limited|evaluat(?:ed|ing)|consider(?:ed|ing)|compar(?:ed|ing))\b/i;
const CLAUSE_HEDGE = /\bor\b|\b(?:similar|equivalents?|comparable|etc)\b/i;
// A nice-to-have anywhere in the sentence: "Experience with Looker is a plus."
const NICE_TO_HAVE = /\b(?:is|are|would be|a)\s+(?:a\s+)?(?:big\s+|huge\s+|strong\s+)?(?:plus|bonus)\b|\bnice[- ]to[- ]haves?\b|\bbonus points?\b/i;
const HEDGE_WORD = "(?:bonus|nice[- ]to[- ]haves?|preferred|desired|pluses|extra credit|good to have)";
// "Bonus Experience: payments ...; Pigment, NetSuite, Looker, Snowflake"
const HEDGE_LEAD_IN = new RegExp(`^\\W*${HEDGE_WORD}\\b[^:]{0,40}:`, "i");
// A heading that opens a nice-to-have list ("Preferred Qualifications"), and one that closes it.
const HEDGE_HEADING = new RegExp(`^${HEDGE_WORD}\\b`, "i");
const OTHER_HEADING =
  /^(?:requirements|qualifications|minimum|basic|required|responsibilities|what (?:you|we)|who you|about|benefits|perks|compensation|you will|you'll|your role|the role|the team|why|our)\b/i;
// "Our stack (Snowflake, dbt, Looker)" names what the company runs.
const OUR_STACK =
  /\b(?:we use|we run|we(?:'re| are) on|our (?:current |modern |core )?(?:data |tech(?:nology)? |analytics )?(?:stack|tools?|tooling|platform)|built on|runs? on|powered by|tech stack)\b/i;
const BOUNDARIES = [";", ":", "(", ")", "[", "]", " - ", " – ", " — "];

// A tool the company moved off: "migrated from Redshift to Snowflake", "replaced
// Tableau with Omni", "unifying Tableau and Power BI into Omni", "full Tableau
// shutdown", "Looker was retired". The tool it moved to stays current.
const FORMER_VERB =
  /\b(?:replac(?:e|ed|es|ing)|sunsett?(?:ed|ing)?|retir(?:e|ed|es|ing)|decommission(?:ed|ing)?|deprecat(?:e|ed|es|ing)|shut(?:ting)? down|phas(?:e|ed|es|ing) out|rip(?:ped|ping)? out|previously (?:used|ran|on)|formerly|used to (?:use|run|be on))\b/gi;
const MOVE_FROM = /\b(?:migrat\w*|mov(?:e|ed|es|ing)|switch\w*|transition\w*)\b[^.;]{0,60}?\b(?:off(?: of)?|away from|from)\s/gi;
// "Unifying Tableau, Power BI and MicroStrategy into Omni": only with an "into" after the tool.
const CONSOLIDATE = /\b(?:unif(?:y|ied|ies|ying)|consolidat(?:e|ed|es|ing))\b/gi;
const TOWARD = /\b(?:with|to|into|onto|by|for|in favou?r of)\b/i;
const AFTER_FORMER =
  /^\W{0,3}(?:(?:was|were|is|are|has been|have been|being|got|will be)\s+)?(?:shutdown|shut down|sunset|retired|retirement|decommissioned|deprecated|replaced|phased out|ripped out)\b/i;

function isFormerAt(sentence: string, at: number, len: number): boolean {
  const after = sentence.slice(at + len);
  if (AFTER_FORMER.test(after)) return true;
  const before = sentence.slice(Math.max(0, at - 120), at);
  // The nearest such verb before the tool, with no "with", "to" or "into" in between.
  const nearest = (re: RegExp) => {
    let last: RegExpExecArray | undefined;
    for (const m of before.matchAll(re)) last = m;
    return last && !TOWARD.test(before.slice((last.index ?? 0) + last[0].length)) ? last : undefined;
  };
  if (nearest(FORMER_VERB) || nearest(MOVE_FROM)) return true;
  return !!nearest(CONSOLIDATE) && /\b(?:into|onto)\b/i.test(after);
}

/** Inside "( … )" with three or more items, and nothing says the company runs them. */
function inOptionList(sentence: string, at: number): boolean {
  const open = sentence.lastIndexOf("(", at);
  if (open === -1 || sentence.slice(open, at).includes(")")) return false;
  const close = sentence.indexOf(")", at);
  const inner = sentence.slice(open + 1, close === -1 ? undefined : close);
  const items = inner.split(/\s*(?:,|\/|;|\band\b|\bor\b)\s*/).filter((s) => s.trim());
  return items.length >= 3 && !OUR_STACK.test(sentence.slice(0, open));
}

/** The clause around a match, bounded by ; : ( ) [ ] or a spaced dash. */
function clauseAround(sentence: string, at: number, len: number): string {
  const before = sentence.slice(0, at);
  let start = 0;
  for (const c of BOUNDARIES) {
    const i = before.lastIndexOf(c);
    if (i >= 0 && i + c.length > start) start = i + c.length;
  }
  const after = sentence.slice(at + len);
  const ends = BOUNDARIES.map((c) => after.indexOf(c)).filter((i) => i >= 0);
  return sentence.slice(start, at + len + (ends.length ? Math.min(...ends) : after.length));
}

/**
 * How a sentence names a tool: plainly ("firm"), as one option among several or
 * a nice-to-have ("option"), or as something the company moved off ("former").
 * `hedgedSection`: the sentence sits under a nice-to-have heading.
 */
export type MentionKind = "firm" | "option" | "former";
export function mentionKind(sentence: string, at: number, len: number, hedgedSection = false): MentionKind {
  if (isFormerAt(sentence, at, len)) return "former";
  const hedged =
    hedgedSection ||
    NICE_TO_HAVE.test(sentence) ||
    HEDGE_LEAD_IN.test(sentence) ||
    LEAD_HEDGE.test(sentence.slice(0, at)) ||
    CLAUSE_HEDGE.test(clauseAround(sentence, at, len)) ||
    inOptionList(sentence, at);
  return hedged ? "option" : "firm";
}

export interface Mention {
  tool: StackTool;
  /** Named plainly (a stack list, "we use"), not as one option among several. */
  firm: boolean;
  /** Named as something the company moved off ("migrated from Redshift"). */
  former?: true;
  quote: string;
}

/**
 * A sentence end: ". ", "! " or "? ", but not after an abbreviation, so
 * "(e.g. Looker or Tableau)" and "Sr. Data Engineer" stay whole.
 */
const ABBREVIATIONS = "e\\.g|i\\.e|etc|vs|incl|approx|esp|Inc|Corp|Co|Ltd|Jr|Sr|Mr|Ms|Mrs|Dr|St|No";
export const SENTENCE_END = new RegExp(`(?<=[.!?])(?<!\\b(?:${ABBREVIATIONS})\\.)\\s+`);
/** The punctuation that ends a sentence (not "e.g."), followed by a space or the end of the text. */
export const SENTENCE_STOP = new RegExp(`(?<!\\b(?:${ABBREVIATIONS}))[.!?](?=\\s|$)`);

/** Sentences, bullets and excerpt windows (" … ") as separate units. */
export function sentencesOf(text: string): string[] {
  return text
    .split(new RegExp(`\\s…\\s|${SENTENCE_END.source}|\\n+|\\s•\\s`))
    .map((s) => s.replace(/^[•\-*\s]+/, "").trim())
    .filter((s) => s.length > 3);
}

/**
 * Sentences (as sentencesOf), each marked `hedged` when it sits under a
 * nice-to-have heading ("Preferred Qualifications", "Bonus") until the next
 * heading ("Benefits", "What you'll do:").
 */
export function unitsOf(text: string): { text: string; hedged: boolean }[] {
  let hedged = false;
  return sentencesOf(text).map((s) => {
    const heading = s.split(/\s+/).length <= 6 && !/[.!?]$/.test(s);
    if (heading && HEDGE_HEADING.test(s)) hedged = true;
    else if (heading && (/:$/.test(s) || OTHER_HEADING.test(s))) hedged = false;
    return { text: s, hedged };
  });
}

/** A nice-to-have sentence, labeled so it reads as one out of context ("Nice to have: Looker"). */
export function labeledUnit(u: { text: string; hedged: boolean }): string {
  return u.hedged && !HEDGE_LEAD_IN.test(u.text) && !HEDGE_HEADING.test(u.text) ? `Nice to have: ${u.text}` : u.text;
}

const RANK: Record<MentionKind, number> = { firm: 2, former: 1, option: 0 };

/** Each catalog tool a text names: firm if any mention is plain, else former, else an option; with the best quote. */
export function toolMentions(text: string): Mention[] {
  const out = new Map<string, Mention & { kind: MentionKind }>();
  for (const unit of unitsOf(text)) {
    const sentence = unit.text;
    for (const t of STACK_TOOLS) {
      const m = t.re.exec(sentence);
      if (!m) continue;
      const kind = mentionKind(sentence, m.index, m[0].length, unit.hedged);
      const prev = out.get(t.name);
      if (prev && RANK[kind] <= RANK[prev.kind]) continue;
      const shown = labeledUnit(unit);
      const quote = shown.length > 300 ? `${shown.slice(0, 297)}…` : shown;
      out.set(t.name, { tool: t, firm: kind === "firm", ...(kind === "former" ? { former: true as const } : {}), quote, kind });
    }
  }
  return [...out.values()].map(({ kind: _kind, ...m }) => m);
}

/** Every catalog tool a text names, with where it first appears. */
export function toolsInText(text: string): { tool: StackTool; at: number; len: number }[] {
  const found: { tool: StackTool; at: number; len: number }[] = [];
  for (const t of STACK_TOOLS) {
    const m = t.re.exec(text);
    if (m) found.push({ tool: t, at: m.index, len: m[0].length });
  }
  return found;
}
