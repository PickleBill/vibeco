import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { ArrowRight, Link2 } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { getSeller } from "@/lib/sellers";
import { FieldPill } from "@/components/territory/ui";
import type { AccountAnalysis, AccountBrief } from "./AccountViews";
import { AccountExplorer } from "./explorer/AccountExplorer";
import { linkBtn, secondaryBtn } from "./explorer/look";
import { useAgentBoard } from "./explorer/useAgentBoard";

interface Props {
  company: string;
  brief: AccountBrief;
  plan: string | null;
  createdAt: string;
  analysis: AccountAnalysis | null;
}

/**
 * /report/:id for a target-account run: the same explorer as the live page,
 * replayed from the saved run, under a top bar that matches the territory
 * command center. The seller's theme goes on <html> while the page is open.
 */
const AccountReport = ({ company, brief, plan, createdAt, analysis }: Props) => {
  const { id } = useParams<{ id: string }>();
  const seller = getSeller(brief.seller);
  const { board, settle } = useAgentBoard();
  useEffect(() => {
    if (analysis) settle(analysis, { replay: true });
  }, [analysis, settle]);

  const theme = seller?.theme;
  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;
    root.classList.add(theme);
    return () => root.classList.remove(theme);
  }, [theme]);

  const copyLink = async () => {
    if (await copyToClipboard(window.location.href)) toast.success("Link copied");
    else toast.error("Couldn't copy the link.");
  };
  const generated = new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${company}: first-call plan | VibeCo`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-border bg-background px-4 py-3 sm:px-7">
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
            <Link to="/" className="font-display text-[21px] font-bold tracking-[-0.01em] text-foreground">
              VibeCo
            </Link>
            <span className="truncate text-[15px] text-[#4A4F63]">{seller ? "Territory Command Center" : "Target account"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {seller && (
              <FieldPill className="h-8 text-sm">
                Seller profile: {seller.name} <span className="text-xs font-normal text-muted-foreground">unofficial</span>
              </FieldPill>
            )}
            {seller && id && (
              <Link to={`/for/${seller.id}/account/${id}`} className={secondaryBtn}>
                Open in the territory <ArrowRight size={16} aria-hidden />
              </Link>
            )}
            <button type="button" onClick={copyLink} className={secondaryBtn}>
              <Link2 size={16} aria-hidden /> Copy link
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 pt-6 sm:px-8 sm:pt-7">
          <h1 className="sr-only">First-call plan: {company}</h1>
          <p className="mb-4 font-mono text-[13px] text-muted-foreground">
            Shared report · generated {generated}
            {seller ? " · unofficial, built from public sources" : " · built from public sources"}
          </p>
          <AccountExplorer company={company} brief={brief} plan={plan} analysis={analysis} board={board} sellerName={seller?.name} />
        </main>

        <footer className="border-t border-border">
          <div className="flex flex-col gap-1.5 px-4 py-5 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p>{seller ? `${seller.footer} AI voices are synthetic.` : "Built from public sources. AI voices are synthetic."}</p>
            <Link to={seller ? `/for/${seller.id}/account` : "/simulate?lens=account"} className={linkBtn}>
              Run another account <ArrowRight size={15} aria-hidden />
            </Link>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
};

export default AccountReport;
