import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { SellerConfig } from "@/lib/sellers";
import AccountRunner from "./AccountRunner";

/**
 * The target-account page body: headline, one input, example chips, saved
 * runs, then the live run. Used by /for/:seller and /simulate?lens=account.
 * Words only for the seller: no logos, no brand colors, no personal names.
 */
const AccountPage = ({ seller, initialCompany }: { seller?: SellerConfig; initialCompany?: string }) => {
  const saved = seller?.savedRuns ?? [];
  return (
    <>
      <main className="pt-28 pb-20 lg:pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
          <AccountRunner
            seller={seller}
            initialCompany={initialCompany}
            intro={
              <>
                <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                  <span className="h-px w-6 bg-primary" aria-hidden />
                  {seller ? `For ${seller.name} sellers` : "Target account"}
                </p>
                <h1 className="mt-5 font-display text-[2.3rem] font-bold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-[3.4rem]">
                  {seller?.headline ?? "Know the account before the first call."}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {seller?.intro ??
                    "Type a company. VibeCo reads its own job posts and product pages, searches the web for its data stack and the last 12 months of news, then writes a first-call plan with every claim linked to its source."}
                </p>
              </>
            }
            afterForm={
              saved.length > 0 ? (
                <div className="mt-6 max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Saved runs</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {saved.map((r) => (
                      <Link
                        key={r.reportId}
                        to={`/report/${r.reportId}`}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {r.company}
                        <ArrowRight size={13} aria-hidden />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null
            }
          />
        </div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
          <p>{seller?.footer ?? "Built from public sources. Check anything important before you rely on it."}</p>
          <Link to="/" className="hover:text-foreground">
            Made with VibeCo
          </Link>
        </div>
      </footer>
    </>
  );
};

export default AccountPage;
