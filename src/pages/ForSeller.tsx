import { HelmetProvider, Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import AccountPage from "@/components/account/AccountPage";
import { getSeller } from "@/lib/sellers";
import NotFound from "./NotFound";

/**
 * /for/:seller: account briefs written for one seller (e.g. /for/omni).
 * Unlisted: not in the nav or the sitemap, and noindex.
 */
const ForSeller = () => {
  const { seller: sellerId } = useParams<{ seller: string }>();
  const seller = getSeller(sellerId);
  if (!seller) return <NotFound />;

  return (
    <HelmetProvider>
      <Helmet>
        <title>{`Account briefs for ${seller.name} sellers | VibeCo`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content={`First-call plans for ${seller.name} sellers, built from public sources.`} />
      </Helmet>
      <Navbar />
      <AccountPage seller={seller} />
    </HelmetProvider>
  );
};

export default ForSeller;
