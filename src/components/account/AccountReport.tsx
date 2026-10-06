import { Link } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { getSeller } from "@/lib/sellers";
import SourcesList from "@/components/simulator/SourcesList";
import { AccountSections, CriticsPanel, PlanCard, StackTable, type AccountAnalysis, type AccountBrief } from "./AccountViews";

interface Props {
  company: string;
  brief: AccountBrief;
  plan: string | null;
  createdAt: string;
  analysis: AccountAnalysis | null;
  /** The synthesis verdict block, rendered by the report page. */
  verdict?: React.ReactNode;
}

/** /report/:id for a target-account run: the plan first, then the evidence, then the critics. */
const AccountReport = ({ company, brief, plan, createdAt, analysis, verdict }: Props) => {
  const seller = getSeller(brief.seller);
  return (
    <HelmetProvider>
      <Helmet>
        <title>{`${company}: first-call plan | VibeCo`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6">
          <header className="pb-2 text-center">
            <p className="text-xs uppercase tracking-widest text-primary">
              First-call plan{seller ? ` for ${/^[aeiou]/i.test(seller.name) ? "an" : "a"} ${seller.name} seller` : ""}
            </p>
            <h1 className="mt-1 font-display text-2xl font-black text-foreground sm:text-3xl">{company}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Generated {new Date(createdAt).toLocaleDateString()}
              {seller ? " · Unofficial, built from public sources" : " · Built from public sources"}
            </p>
          </header>

          {plan ? (
            <PlanCard company={company} plan={plan} brief={brief} sellerName={seller?.name} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">This run has no plan saved.</p>
          )}
          <StackTable lines={brief.core_features} research={brief.research} />
          <SourcesList research={brief.research} />
          <AccountSections brief={brief} />
          <CriticsPanel analysis={analysis} />
          {verdict}

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
