import AccountRunner from "@/components/account/AccountRunner";
import { Eyebrow } from "../ui";
import type { ModuleProps } from "./types";

/**
 * 02 · Run an account: the live account lens (research, plan, seven agents,
 * verdict), or a saved run by id. Once a run starts the intro folds into a
 * compact run bar, so the results start near the top.
 */
export function AccountModule({ seller, reportId }: ModuleProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <AccountRunner
        key={reportId ?? "live"}
        seller={seller}
        initialReportId={reportId}
        inShell
        intro={
          <>
            <Eyebrow>Run an account · live</Eyebrow>
            <h1 className="mt-3 font-display text-[2.1rem] font-bold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.75rem]">{seller.headline}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4A4F63] sm:text-[17px]">{seller.intro}</p>
          </>
        }
      />
    </div>
  );
}
