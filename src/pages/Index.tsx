import { Helmet, HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Thesis from "../components/Thesis";
import Services from "../components/Services";
import Model from "../components/Model";
import Fit from "../components/Fit";
import Builds from "../components/Builds";
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
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(websiteJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background text-foreground scroll-smooth">
        <Navbar />
        <main>
          <Hero />
          <Thesis />
          <Services />
          <Model />
          <Fit />
          <Builds />
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
