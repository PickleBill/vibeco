import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import StatsBar from "../components/StatsBar";
import EverydayFounders from "../components/EverydayFounders";
import Differentiator from "../components/Differentiator";
import SpeedTimeline from "../components/SpeedTimeline";
import ProjectShowcase from "../components/ProjectShowcase";
import Builds from "../components/Builds";
import Model from "../components/Model";
import Credibility from "../components/Credibility";
import Testimonials from "../components/Testimonials";
import Fit from "../components/Fit";
import ContactForm from "../components/ContactForm";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";
import VariantSwitcher from "../components/VariantSwitcher";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VibeCo",
  description:
    "Good vibes, instantly. VibeCo turns your ideas into live products with AI — shipped in hours, not months.",
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
        text: "VibeCo offers flexible partnership structures: Revenue Share (we build it, you sell it — we earn as you grow), Advisory Equity (we invest our time for a small stake), or Paid Build (flat fee, you own 100%).",
      },
    },
    {
      "@type": "Question",
      name: "How fast can VibeCo build a product?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Using AI-powered workflows, VibeCo can take an idea from conversation to live, working product in hours — not months.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be technical to work with VibeCo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not at all. VibeCo works with creators, experts, and business owners across every industry. You bring the idea — we handle all the technology.",
      },
    },
  ],
};

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>VibeCo — One Conversation. One Live Product.</title>
        <meta
          name="description"
          content="VibeCo turns ideas into live products with AI. Shipped in hours, not months. For creators, experts, and founders who move fast."
        />
        <link rel="canonical" href="https://vibeco.dev" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="VibeCo — One Conversation. One Live Product." />
        <meta
          property="og:description"
          content="Ideas to live products in hours. AI-powered product studio."
        />
        <meta property="og:url" content="https://vibeco.dev" />
        <meta property="og:site_name" content="VibeCo" />
        <meta property="og:image" content="https://vibeco.dev/og-image.png" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeCo — One Conversation. One Live Product." />
        <meta
          name="twitter:description"
          content="Ideas to live products in hours. AI-powered product studio."
        />
        <meta name="twitter:image" content="https://vibeco.dev/og-image.png" />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground scroll-smooth">
        <Navbar />
        <main>
          <Hero />
          <StatsBar />
          <EverydayFounders />
          <Differentiator />
          <ProjectShowcase />
          <Builds />
          <SpeedTimeline />
          <Model />
          <Credibility />
          <Testimonials />
          <Fit />
          <ContactForm />
          <FinalCta />
        </main>
        <Footer />
        <VariantSwitcher />
      </div>
    </HelmetProvider>
  );
};

export default Index;
