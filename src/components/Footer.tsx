import { useNavigate, useLocation } from "react-router-dom";
import { Asterisk } from "lucide-react";

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
            <p className="text-sm text-muted-foreground mt-1">Turn a messy question into a clear next move.</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {[
              { label: "Start a question", href: "/simulate" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Use cases", href: "#use-cases" },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => go(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} VibeCo. AI output is a starting point for judgment, not advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
