import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Thesis from "../components/Thesis";
import Services from "../components/Services";
import Model from "../components/Model";
import Fit from "../components/Fit";
import EverydayFounders from "../components/EverydayFounders";
import Builds from "../components/Builds";
import ProjectShowcase from "../components/ProjectShowcase";
import Differentiator from "../components/Differentiator";
import Credibility from "../components/Credibility";
import ContactForm from "../components/ContactForm";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VibeCo",
  description:
    "AI-native product studio for high-conviction founders. Selective partnerships, rapid MVP execution, shared upside.",
  url: "https://vibeco.dev",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VibeCo",
  url: "https://vibeco.dev",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does VibeCo's partnership model work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VibeCo offers four partnership structures: Revenue Share (we build it, you sell it — we take a percentage of ARR), Advisory Equity ($0–$3k upfront + 0.5–2% equity), Hybrid (reduced fee plus smaller equity/revenue share), and Paid MVP Build (flat-fee, scope-locked engagement).",
      },
    },
    {
      "@type": "Question",
      name: "How fast can VibeCo build an MVP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Using AI-native workflows, VibeCo compresses typical development timelines from months to focused 2–4 week sprints. Every decision is optimized for learning speed and commercial signal.",
      },
    },
    {
      "@type": "Question",
      name: "What kind of founders does VibeCo work with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "VibeCo partners with high-agency founders who have deep domain expertise, a credible distribution edge, and serious intent to test, sell, and iterate quickly. This includes both tech and non-tech founders across industries.",
      },
    },
  ],
};

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>VibeCo — AI-Native Product Builds for Founders with Real Conviction</title>
        <meta
          name="description"
          content="VibeCo is a founder-led AI product studio that builds sharp, testable MVPs for high-conviction founders. Selective partnerships, rapid execution, shared upside."
        />
        <link rel="canonical" href="https://vibeco.dev" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="VibeCo — Turn Conviction into Software" />
        <meta
          property="og:description"
          content="AI-native product studio for high-conviction founders. Selective partnerships, rapid MVP execution, shared upside."
        />
        <meta property="og:url" content="https://vibeco.dev" />
        <meta property="og:site_name" content="VibeCo" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeCo — Turn Conviction into Software" />
        <meta
          name="twitter:description"
          content="AI-native product studio. Selective partnerships. Skin in the game."
        />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground scroll-smooth">
        <Navbar />
        <main>
          <Hero />
          <Thesis />
          <Services />
          <Model />
          <Fit />
          <EverydayFounders />
          <Builds />
          <ProjectShowcase />
          <Differentiator />
          <Credibility />
          <ContactForm />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default Index;
