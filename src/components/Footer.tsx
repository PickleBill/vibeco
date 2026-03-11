import { useNavigate, useLocation } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (href: string) => {
    if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              className="font-display text-lg font-black text-foreground tracking-tight"
            >
              VibeCo
            </a>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              AI-native product builds for founders with real conviction.
            </p>
          </div>
          <div className="flex gap-6">
            {[
              { label: "How It Works", href: "#model" },
              { label: "Builds", href: "#builds" },
              { label: "Contact", href: "#contact" },
            ].map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border">
          <p className="font-mono text-xs text-muted-foreground">
            © {new Date().getFullYear()} VibeCo. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
