// Omni (omni.co) seller profile for the "account" lens. Public facts only, each
// with its source. Funding totals and customer counts are deliberately left out.
import type { SellerProfile } from "./index.ts";

const PRESS = "https://omni.co/blog/press-release-omni-series-c-funding";
const CASE = (slug: string) => `https://omni.co/blog/case-study-${slug}`; // listed on https://omni.co/customer-case-studies

export const OMNI: SellerProfile = {
  id: "omni",
  name: "Omni",
  // PRESS: "Built on a semantic model that provides shared metrics, permissions, and Git version control"
  // PRESS: "The same model powers dashboards, workbooks, spreadsheets, ad-hoc SQL, and AI queries."
  sells:
    "an AI analytics platform built on a governed semantic model (shared metrics, permissions and Git version control). The same model answers dashboards, spreadsheets, SQL and AI queries.",
  // PRESS: "companies consolidating legacy BI use cases, accelerating AI adoption, and building AI data products with Omni"
  motions: [
    "Consolidating legacy BI tools",
    "AI adoption on trusted, governed data",
    "Building AI data products for their own customers",
  ],
  // PRESS: "Omni integrates with Snowflake, Google BigQuery, Databricks, Amazon Redshift, Postgres, ClickHouse"
  warehouses: ["Snowflake", "BigQuery", "Databricks", "Redshift", "Postgres", "ClickHouse"],
  // https://omni.co (footer "Compare": Omni vs. Tableau, PowerBI, Looker, Hex, Sigma, ThoughtSpot, Metabase, Strategy)
  biTools: ["Tableau", "Power BI", "Looker", "Hex", "Sigma", "ThoughtSpot", "Metabase", "Strategy"],
  // https://omni.co (product and partner pages: Semantic Layer, Embedded Analytics, AI, Omni + dbt)
  signals: ["dbt", "analytics engineer hiring", "embedded or customer-facing analytics", "semantic layer or chat-with-data projects"],
  customers: [
    // PRESS: "Customers include BambooHR, Checkr, Cribl, dbt Labs, Guitar Center, Heidi AI, Mercury, Pendo, and Synthesia."
    { name: "BambooHR", source: CASE("bamboohr") },
    { name: "Checkr", source: CASE("checkr") },
    { name: "Cribl", source: PRESS },
    { name: "dbt Labs", source: PRESS, aliases: ["dbt"] },
    { name: "Guitar Center", source: CASE("guitar-center") },
    { name: "Heidi AI", source: PRESS },
    { name: "Mercury", source: PRESS, ambiguous: true },
    { name: "Pendo", source: PRESS },
    { name: "Synthesia", source: PRESS },
    // https://omni.co/customer-case-studies (case-study links on the page, Oct 2026)
    { name: "ActiveProspect", source: CASE("activeprospect") },
    { name: "Ascend", source: CASE("ascend"), ambiguous: true },
    { name: "Aviatrix", source: CASE("aviatrix") },
    { name: "BuzzFeed", source: CASE("buzzfeed") },
    { name: "Caraway", source: CASE("caraway"), ambiguous: true },
    { name: "Feeld", source: CASE("feeld") },
    { name: "Fundrise", source: CASE("fundrise") },
    { name: "Handshake", source: CASE("handshake"), ambiguous: true },
    { name: "incident.io", source: CASE("incident-io") },
    { name: "Otrium", source: CASE("otrium") },
    { name: "Photoroom", source: CASE("photoroom") },
    { name: "The Rounds", source: CASE("the-rounds"), ambiguous: true },
    { name: "Trint", source: CASE("trint") },
    { name: "Uscreen", source: CASE("uscreen") },
    { name: "Zapnito", source: CASE("zapnito") },
  ],
};
