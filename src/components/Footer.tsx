import { useNavigate, useLocation } from "react-router-dom";
import { Asterisk, Linkedin } from "lucide-react";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const go = (href: string) => {
    if (!href.startsWith("#")) {
      navigate(href);
    } else if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); go("/"); }}
              className="flex items-center gap-1 font-display text-lg font-bold text-foreground tracking-tight"
            >
              VibeCo
              <Asterisk size={18} className="text-primary" aria-hidden />
            </a>
            <p className="text-sm text-muted-foreground mt-1">Bill Bricker&rsquo;s working AI lab.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { label: "Workbench", href: "/simulate" },
              { label: "Examples", href: "#examples" },
              { label: "About Bill", href: "#about" },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => go(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
            <a
              href="https://picklebill.github.io/Brick/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              Résumé &amp; proof ↗
            </a>
            <a
              href="https://linkedin.com/in/williambricker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Bill Bricker on LinkedIn"
            >
              <Linkedin size={16} />
            </a>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Bill Bricker. AI output is a starting point for judgment, not advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
