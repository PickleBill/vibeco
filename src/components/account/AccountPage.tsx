import { Link } from "react-router-dom";
import type { SellerConfig } from "@/lib/sellers";
import { Eyebrow } from "@/components/territory/ui";
import AccountRunner from "./AccountRunner";

/**
 * The target-account page body: headline, one input, example chips, saved
 * runs, then the live run. Used by /simulate?lens=account (under the site's
 * fixed navbar, hence the top padding). Words only for the seller: no logos,
 * no brand colors, no personal names.
 */
const AccountPage = ({ seller, initialCompany }: { seller?: SellerConfig; initialCompany?: string }) => {
  return (
    <>
      <main className="pt-28 pb-20 lg:pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
          <AccountRunner
            seller={seller}
            initialCompany={initialCompany}
            intro={
              <>
                <Eyebrow>{seller ? `For ${seller.name} sellers` : "Target account"}</Eyebrow>
                <h1 className="mt-3 font-display text-[2.3rem] font-bold leading-[1.04] tracking-[-0.03em] text-foreground sm:text-[3.2rem]">
                  {seller?.headline ?? "Know the account before the first call."}
                </h1>
                <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4A4F63] sm:text-[17px]">
                  {seller?.intro ??
                    "Type a company. VibeCo reads its own job posts and product pages, searches the web for its data stack and the last 12 months of news, then writes a first-call plan with every claim linked to its source."}
                </p>
              </>
            }
          />
        </div>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-12">
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
