import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WorkbenchHero from "../components/workbench/WorkbenchHero";
import StepsStrip from "../components/workbench/StepsStrip";
import ExamplesSection from "../components/workbench/ExamplesSection";
import BuildsShelf from "../components/workbench/BuildsShelf";
import AboutBill from "../components/workbench/AboutBill";

const SITE_URL = "https://vibeco.lovable.app";
const TITLE = "VibeCo — Turn a messy question into a clear next move";
const DESCRIPTION =
  "Bill Bricker's working AI lab. Explore an idea, research a company, pressure-test an initiative, or work through a decision, and leave with a clear next move.";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "VibeCo",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "BusinessApplication",
  creator: {
    "@type": "Person",
    name: "Bill Bricker",
    url: "https://picklebill.github.io/Brick/",
    sameAs: ["https://linkedin.com/in/williambricker"],
  },
};

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />

        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:site_name" content="VibeCo" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground scroll-smooth">
        <Navbar />
        <main>
          <WorkbenchHero />
          <StepsStrip />
          <ExamplesSection />
          <AboutBill />
          <BuildsShelf />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default Index;
