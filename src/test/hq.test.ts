import { describe, expect, it } from "vitest";
import { getSeller, hqOf } from "@/lib/sellers";

const omni = getSeller("omni")!;
const accounts = omni.territory!.accounts;
const SOUTHEAST = ["AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "SC", "TN", "VA", "WV"];

describe("headquarters", () => {
  it("every territory account has one, and every one is in the Southeast", () => {
    for (const a of accounts) {
      expect(a.hq, a.company).toMatch(/^[A-Z][A-Za-z.' -]+, [A-Z]{2}$/);
      expect(SOUTHEAST, a.company).toContain(a.hq!.slice(-2));
    }
  });

  it("is found by saved run, or by name or domain for a fresh run of the account; unknown companies get none", () => {
    expect(hqOf(omni, { reportId: "e71ea1b4-c34b-4dc4-8124-428a16264a93" })).toBe("Atlanta, GA");
    expect(hqOf(omni, { reportId: "a-new-run", company: "Equifax (equifax.com)" })).toBe("Atlanta, GA");
    expect(hqOf(omni, { company: "first citizens" })).toBe("Raleigh, NC");
    expect(hqOf(omni, { company: "First Citizens Bank (firstcitizens.com)" })).toBe("Raleigh, NC");
    expect(hqOf(omni, { company: "Somebody Else (firstcitizens.com)" })).toBe("Raleigh, NC");
    expect(hqOf(omni, { company: "Guitar Center" })).toBeUndefined();
    expect(hqOf(undefined, { company: "Equifax" })).toBeUndefined();
  });

  it("leads with an A-graded Strategic account, and First Citizens is on the list", () => {
    expect(accounts[0].company).toBe("Equifax (equifax.com)");
    expect(accounts[0].segment).toBe("Strategic");
    expect(omni.savedRuns[0].company).toBe("Equifax (equifax.com)");
    expect(omni.savedRuns.map((r) => r.company)).toContain("First Citizens (firstcitizens.com)");
    expect(new Set(accounts.map((a) => a.reportId)).size).toBe(accounts.length);
  });
});
