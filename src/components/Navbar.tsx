import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const navLinks = [
  { label: "How It Works", href: "#model" },
  { label: "Builds", href: "#builds" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/90 backdrop-blur-sm border-b border-border" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between h-16">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate("/"); }}
          className="font-display text-lg font-black text-foreground tracking-tight"
        >
          VibeCo
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => handleNavClick(link.href)}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </button>
          ))}

          {/* Glowing Simulator pill */}
          <a
            href="/simulate"
            onClick={(e) => { e.preventDefault(); navigate("/simulate"); }}
            className="relative group font-mono text-xs px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/40 hover:bg-primary/20 transition-all duration-300 flex items-center gap-1.5"
          >
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: "0 0 16px hsl(var(--primary) / 0.3)" }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <Sparkles size={12} />
            Simulator
          </a>

          <button
            onClick={() => handleNavClick("#contact")}
            className="font-mono text-xs bg-primary text-primary-foreground px-5 py-2 rounded-sm hover:opacity-90 transition-opacity"
          >
            Pitch Your Idea
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-background border-b border-border px-6 pb-6"
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block py-3 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                {link.label}
              </button>
            ))}
            <a
              href="/simulate"
              onClick={(e) => { e.preventDefault(); setMobileOpen(false); navigate("/simulate"); }}
              className="flex items-center gap-2 py-3 font-mono text-sm text-primary"
            >
              <Sparkles size={13} />
              AI Idea Simulator
            </a>
            <button
              onClick={() => handleNavClick("#contact")}
              className="block mt-2 font-mono text-sm bg-primary text-primary-foreground px-4 py-2 rounded-sm text-center w-full"
            >
              Pitch Your Idea
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
