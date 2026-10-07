import { describe, expect, it } from "vitest";
import { getSeller } from "@/lib/sellers";
import { resolveCompany } from "@/components/account/resolveCompany";

const omni = getSeller("omni");

describe("resolveCompany", () => {
  it("catches the seller itself, by name or by its domain, before any call", () => {
    expect(resolveCompany("Omni", omni)).toEqual({ kind: "seller" });
    expect(resolveCompany("omni.co", omni)).toEqual({ kind: "seller" });
    expect(resolveCompany("Omni Analytics (omni.co)", omni)).toEqual({ kind: "seller" });
    // A different company that shares the word is a normal run.
    expect(resolveCompany("Omni Hotels", omni)).toEqual({ kind: "run", company: "Omni Hotels" });
  });

  it("runs a bare territory name with the territory's domain, so a namesake isn't researched instead", () => {
    expect(resolveCompany("Relay", omni)).toEqual({ kind: "run", company: "Relay (relaypro.com)" });
    expect(resolveCompany("relay", omni)).toEqual({ kind: "run", company: "Relay (relaypro.com)" });
    // A typed domain always wins; an unknown name runs as typed.
    expect(resolveCompany("Relay (relayfi.com)", omni)).toEqual({ kind: "run", company: "Relay (relayfi.com)" });
    expect(resolveCompany("Guitar Center", omni)).toEqual({ kind: "run", company: "Guitar Center" });
    expect(resolveCompany("Relay", undefined)).toEqual({ kind: "run", company: "Relay" });
  });
});
