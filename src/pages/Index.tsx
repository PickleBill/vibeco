import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Thesis from "../components/Thesis";
import EverydayFounders from "../components/EverydayFounders";
import Services from "../components/Services";
import Model from "../components/Model";
import Fit from "../components/Fit";
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
    "AI-powered product studio that turns your ideas into real, live software — fast. For creators, experts, and founders of all kinds.",
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
        text: "VibeCo offers flexible partnership structures: Revenue Share (we build it, you sell it — we earn as you grow), Advisory Equity (we invest our time for a small stake), Hybrid (reduced fee plus smaller equity or revenue share), and Paid Build (flat fee, you own 100%).",
      },
    },
    {
      "@type": "Question",
      name: "How fast can VibeCo build a product?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Using AI-powered workflows, VibeCo can take an idea from conversation to live, working product in hours — not months. Every decision is optimized for speed and real-world feedback.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be technical to work with VibeCo?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not at all. VibeCo works with creators, experts, and business owners across every industry. You bring the idea and the knowledge of your customers — we handle all the technology.",
      },
    },
  ],
};

const Index = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>VibeCo — Your Idea, Built and Live in Hours</title>
        <meta
          name="description"
          content="VibeCo is an AI-powered product studio that turns your ideas into real software — fast. No dev team needed. For creators, experts, and founders of all kinds."
        />
        <link rel="canonical" href="https://vibeco.dev" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="VibeCo — Your Idea, Built and Live in Hours" />
        <meta
          property="og:description"
          content="AI-powered product studio. Describe your idea, we build it — often the same day. For creators, experts, and founders of all kinds."
        />
        <meta property="og:url" content="https://vibeco.dev" />
        <meta property="og:site_name" content="VibeCo" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="VibeCo — Your Idea, Built and Live in Hours" />
        <meta
          name="twitter:description"
          content="AI-powered product studio. Your idea, live in hours. No code needed."
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
          <EverydayFounders />
          <Services />
          <Model />
          <Fit />
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
