import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { companyName, homeDomain, readAbout, readEmployees, readExaResults, readHq, readListedTools } from "./exa.ts";

Deno.test("readHq: US headquarters as City, ST from either company-data line", () => {
  assertEquals(readHq("Glew employs 98 people. Headquartered in Charlotte, North Carolina, United States."), "Charlotte, NC");
  assertEquals(readHq("- Headquarters: atlanta, georgia, united states (US)"), "Atlanta, GA");
  assertEquals(readHq("Headquartered in Boise, Idaho, United States."), "Boise, ID");
  assertEquals(readHq("Headquartered in London, United Kingdom."), undefined);
  assertEquals(readHq("no company data here"), undefined);
});

Deno.test("readEmployees and companyName", () => {
  assertEquals(readEmployees("Acme employs 1,240 people (+3% YoY)"), 1240);
  assertEquals(readEmployees("no headcount"), undefined);
  assertEquals(companyName("Entrinsik, Inc."), "Entrinsik");
  assertEquals(companyName("Glew | Commerce Data Cloud"), "Glew");
});

Deno.test("readExaResults: company rows from Exa's answer; pages without a domain or title dropped", () => {
  const rows = readExaResults({
    results: [
      { title: "Glew", url: "https://glew.io/", highlights: ["Glew employs 98 people. Headquartered in Charlotte, North Carolina, United States."] },
      { title: "", url: "https://nameless.com/" },
      { title: "Broken", url: "not a url" },
    ],
  });
  assertEquals(rows.length, 1);
  assertEquals(rows[0].name, "Glew");
  assertEquals(rows[0].domain, "glew.io");
  assertEquals(rows[0].hq, "Charlotte, NC");
  assertEquals(rows[0].employees, 98);
});

Deno.test("homeDomain: the company data's homepage; a subpage or link-in-bio page isn't the company's site", () => {
  assertEquals(homeDomain("https://gassouth.com/", "- Homepage: gassouth.com"), "gassouth.com");
  assertEquals(homeDomain("https://www.maxio.com/", "no data"), "maxio.com");
  assertEquals(homeDomain("https://jmfamily.com/our-businesses/southeast-toyota-distributors", "no data"), "");
  assertEquals(homeDomain("https://linktr.ee/extendedstayamerica", "- Homepage: linktr.ee/extendedstayamerica"), "");
});

Deno.test("readListedTools: warehouse, transformation and BI tools from the tech-stack list, in catalog order", () => {
  const text = "- Tech Stack (showing 50 of 105): asana, power bi, postgresql, tableau, snowflake data warehouse, apache airflow, azure databricks, omni, kafka";
  assertEquals(readListedTools(text), ["Snowflake", "Databricks", "Airflow", "Tableau", "Power BI"]);
  assertEquals(readListedTools("no list"), []);
});

Deno.test("readAbout: the first description passage, without the data lists, emails or phone numbers", () => {
  const about = readAbout([
    "",
    "Gas South is a Oil and Gas company. Call 877-427-4321 or sales@gassouth.com. Headquartered in Atlanta, Georgia, United States.\n- Key Executives:\n  - Pat Doe: CFO",
    "- Industry: Oil and Gas",
  ]);
  assertEquals(about, "Gas South is a Oil and Gas company. Call or . Headquartered in Atlanta, Georgia, United States.");
});

Deno.test("readExaResults: a subpage result is dropped; the listed tools ride along", () => {
  const rows = readExaResults({
    results: [
      { title: "Southeast Toyota Distributors, LLC", url: "https://jmfamily.com/our-businesses/southeast-toyota-distributors", highlights: ["Headquartered in Deerfield Beach, Florida, United States."] },
      { title: "Gas South", url: "https://gassouth.com/", highlights: ["Gas South employs 463 people. Headquartered in Atlanta, Georgia, United States.", "- Homepage: gassouth.com\n- Tech Stack (showing 50 of 105): power bi, snowflake"] },
    ],
  });
  assertEquals(rows.map((r) => [r.name, r.domain, r.hq, r.employees, r.tools]), [["Gas South", "gassouth.com", "Atlanta, GA", 463, ["Snowflake", "Power BI"]]]);
});
