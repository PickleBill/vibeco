import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import EverydayFounders from "../components/EverydayFounders";
import SpeedTimeline from "../components/SpeedTimeline";
import Model from "../components/Model";
import ProjectShowcase from "../components/ProjectShowcase";
import Fit from "../components/Fit";
import ContactForm from "../components/ContactForm";
import FinalCta from "../components/FinalCta";
import Footer from "../components/Footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VibeCo",
  description:
    "Good vibes, instantly. VibeCo brings your ideas to life with AI — real products, live in hours, no dev team needed.",
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
        <title>VibeCo — Good Vibes, Instantly. Bring Your Idea to Life.</title>
        <meta
          name="description"
          content="VibeCo brings your ideas to life with AI. Real products, live in hours, no dev team needed. For creators, experts, and founders of all kinds."
        />
        <link rel="canonical" href="https://vibeco.dev" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="VibeCo — Good Vibes, Instantly." />
        <meta
          property="og:description"
          content="Bring your idea to life. AI-powered product studio — live in hours, not months."
        />
        <meta property="og:url" content="https://vibeco.dev" />
        <meta property="og:site_name" content="VibeCo" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeCo — Good Vibes, Instantly." />
        <meta
          name="twitter:description"
          content="Bring your idea to life. AI-powered product studio — live in hours."
        />

        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground scroll-smooth">
        <Navbar />
        <main>
          <Hero />
          <EverydayFounders />
          <SpeedTimeline />
          <Model />
          <ProjectShowcase />
          <Fit />
          <ContactForm />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

export default Index;
