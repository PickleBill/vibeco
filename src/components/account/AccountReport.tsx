import { useEffect } from "react";
import { Link } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { getSeller } from "@/lib/sellers";
import type { AccountAnalysis, AccountBrief } from "./AccountViews";
import { AccountExplorer } from "./explorer/AccountExplorer";
import { useAgentBoard } from "./explorer/useAgentBoard";

interface Props {
  company: string;
  brief: AccountBrief;
  plan: string | null;
  createdAt: string;
  analysis: AccountAnalysis | null;
}

/** /report/:id for a target-account run: the same explorer as the live page, replayed from the saved run. */
const AccountReport = ({ company, brief, plan, createdAt, analysis }: Props) => {
  const seller = getSeller(brief.seller);
  const { board, settle } = useAgentBoard();
  useEffect(() => {
    if (analysis) settle(analysis, { replay: true });
  }, [analysis, settle]);

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${company}: first-call plan | VibeCo`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="mx-auto max-w-5xl space-y-6 px-4 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Generated {new Date(createdAt).toLocaleDateString()}
              {seller ? " · Unofficial, built from public sources" : " · Built from public sources"}
            </p>
            <button
              type="button"
              onClick={async () => {
                if (await copyToClipboard(window.location.href)) toast.success("Link copied");
                else toast.error("Couldn't copy the link.");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Link2 size={12} aria-hidden /> Copy link
            </button>
          </header>

          <AccountExplorer company={company} brief={brief} plan={plan} analysis={analysis} board={board} sellerName={seller?.name} />

          <footer className="border-t border-border/40 pt-5 text-center">
            {seller && <p className="mb-3 text-xs text-muted-foreground">{seller.footer}</p>}
            <Link
              to={seller ? `/for/${seller.id}` : "/simulate?lens=account"}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              Run another account <ArrowRight size={14} aria-hidden />
            </Link>
          </footer>
        </div>
      </div>
    </HelmetProvider>
  );
};

export default AccountReport;
