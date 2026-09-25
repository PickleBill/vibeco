import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Asterisk, ArrowRight, ChevronDown } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Use cases", href: "#use-cases" },
];

// Owner tools stay reachable for signed-in accounts but out of the public nav.
const accountLinks = [
  { label: "My runs", href: "/my-simulations" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Hub", href: "/hub" },
  { label: "Signal", href: "/signal" },
];

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Every visitor gets an anonymous session (see ensureSession), so only a
  // real account counts as signed in.
  const signedIn = !!user && !user.is_anonymous;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const go = (href: string) => {
    setMobileOpen(false);
    if (!href.startsWith("#")) {
      navigate(href);
      return;
    }
    if (location.pathname !== "/") {
      navigate("/" + href);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMobileOpen(false);
  };

  const linkClass = "text-sm text-muted-foreground hover:text-foreground transition-colors duration-200";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen ? "bg-background/90 backdrop-blur-sm border-b border-border" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-16">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); go("/"); }}
          className="flex items-center gap-1 font-display text-xl font-bold text-foreground tracking-tight"
        >
          VibeCo
          <Asterisk size={20} className="text-primary" aria-hidden />
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href.startsWith("#") ? "/" + link.href : link.href}
              onClick={(e) => { e.preventDefault(); go(link.href); }}
              className={linkClass}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm text-foreground hover:border-primary/40">
                Account <ChevronDown size={14} aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {accountLinks.map((l) => (
                  <DropdownMenuItem key={l.href} onSelect={() => go(l.href)}>
                    {l.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <a
              href="/auth"
              onClick={(e) => { e.preventDefault(); go("/auth"); }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </a>
          )}
          <a
            href="/simulate"
            onClick={(e) => { e.preventDefault(); go("/simulate"); }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Start a question <ArrowRight size={14} aria-hidden />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
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
            className="md:hidden bg-background border-b border-border px-4 pb-6"
          >
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => go(link.href)}
                className="block py-3 text-sm text-foreground w-full text-left"
              >
                {link.label}
              </button>
            ))}
            {signedIn ? (
              <div className="mt-2 border-t border-border pt-2">
                {accountLinks.map((l) => (
                  <button
                    key={l.href}
                    onClick={() => go(l.href)}
                    className="block py-3 text-sm text-muted-foreground w-full text-left"
                  >
                    {l.label}
                  </button>
                ))}
                <button onClick={handleSignOut} className="block py-3 text-sm text-muted-foreground w-full text-left">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => go("/auth")} className="block py-3 text-sm text-muted-foreground w-full text-left">
                Sign in
              </button>
            )}
            <button
              onClick={() => go("/simulate")}
              className="mt-3 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              Start a question
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
