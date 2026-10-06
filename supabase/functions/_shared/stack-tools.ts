// Data-stack products the account lens looks for in a company's own job posts,
// by stack category. Patterns are word-bounded; tools whose names are also
// everyday words (Spark, Sigma, Mode, Hex, Bedrock) need the product's casing
// or a nearby BI tool, so "spark curiosity" or "Six Sigma" don't count.

export type StackCategory = "Warehouse" | "Transformation" | "BI tools" | "AI" | "Embedded analytics";

export interface StackTool {
  name: string;
  category: StackCategory;
  re: RegExp;
}

// Names that are also everyday words count only next to another data tool in a list.
const NEIGHBOR =
  "(?:Looker|Tableau|Power ?BI|Mode|Hex|Sigma|Omni|Metabase|ThoughtSpot|Periscope|Superset|Jupyter|dbt|Snowflake|BigQuery|Databricks|Redshift|Fivetran|Airflow)";
const LIST = "\\s*(?:,|/|\\bor\\b|\\band\\b)\\s*";
const listed = (word: string, extra = "") =>
  new RegExp(`${extra}\\b${word}\\b(?=${LIST}${NEIGHBOR}\\b)|\\b${NEIGHBOR}${LIST}${word}\\b`);

const tool = (name: string, category: StackCategory, re: RegExp): StackTool => ({ name, category, re });

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
  tool("Apache Kafka", "Transformation", /\bKafka\b/i),
  tool("Apache Flink", "Transformation", /\bFlink\b/i),
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

  // Embedded analytics: analytics built for the company's own customers
  tool(
    "Customer-facing analytics",
    "Embedded analytics",
    /\b(?:customer|client|user|partner)[- ]facing (?:analytics|dashboards?|reporting|insights|data products?)\b|\bembedded (?:analytics|dashboards?|BI|reporting)\b/i,
  ),
];

// A tool offered as one option among several isn't evidence the company runs
// it. Two kinds of hedge:
//   lead-ins that cover the rest of the sentence ("such as AWS (Redshift), GCP
//   (BigQuery)", "e.g. Looker, Tableau", "preferably Snowflake"), and
//   alternatives inside the tool's own clause ("Snowflake, BigQuery, or
//   Redshift", "dbt / Omni / Hex or equivalents").
const LEAD_HEDGE =
  /\b(?:e\.g|eg|such as|for example|for instance|like|preferabl[ey]|ideally|any (?:of|modern|major|other)|one or more|at least one|including but not limited)\b/i;
const CLAUSE_HEDGE = /\bor\b|\b(?:similar|equivalents?|comparable)\b/i;
const BOUNDARIES = [";", ":", "(", ")", "[", "]", " - ", " – ", " — "];

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

function isFirm(sentence: string, at: number, len: number): boolean {
  return !LEAD_HEDGE.test(sentence.slice(0, at)) && !CLAUSE_HEDGE.test(clauseAround(sentence, at, len));
}

export interface Mention {
  tool: StackTool;
  /** Named plainly (a stack list, "we use"), not as one option among several. */
  firm: boolean;
  quote: string;
}

/** Sentences, bullets and excerpt windows (" … ") as separate units. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/\s…\s|(?<=[.!?])\s+|\n+|\s•\s/)
    .map((s) => s.replace(/^[•\-*\s]+/, "").trim())
    .filter((s) => s.length > 3);
}

/** Each catalog tool a text names, firm if any mention isn't hedged, with the best quote. */
export function toolMentions(text: string): Mention[] {
  const out = new Map<string, Mention>();
  for (const sentence of sentencesOf(text)) {
    for (const t of STACK_TOOLS) {
      const m = t.re.exec(sentence);
      if (!m) continue;
      const firm = isFirm(sentence, m.index, m[0].length);
      const prev = out.get(t.name);
      const quote = sentence.length > 300 ? `${sentence.slice(0, 297)}…` : sentence;
      if (!prev) out.set(t.name, { tool: t, firm, quote });
      else if (firm && !prev.firm) out.set(t.name, { tool: t, firm, quote });
    }
  }
  return [...out.values()];
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
