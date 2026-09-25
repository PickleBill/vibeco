import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowUpRight, ChevronDown, FolderKanban, History, LogOut, Menu, Network, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { clearBrowserDrafts } from "@/lib/browserDrafts";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import "@/styles/studio.css";

const navLinks = [
  { label: "Workbench", to: "/simulate" },
  { label: "Examples", to: "/examples" },
  { label: "About Bill", to: "/about" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const hasAccount = !!user && !user.is_anonymous;

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setUser(session?.user ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobileOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearBrowserDrafts();
      setUser(null);
      setMobileOpen(false);
      navigate("/");
    } catch {
      toast.error("Could not sign out. Please try again.");
    } finally { setSigningOut(false); }
  };

  return (
    <>
      <a className="studio-skip" href="#main-content">Skip to content</a>
      <header className="studio-nav">
        <nav className="studio-container studio-nav-inner" aria-label="Main navigation">
          <Link to="/" className="studio-logo" aria-label="VibeCo home">VibeCo<span aria-hidden="true">✳</span></Link>
          <div className="studio-nav-links">
            {navLinks.map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => `studio-nav-link${isActive ? " is-active" : ""}`}>{link.label}</NavLink>)}
          </div>
          <div className="studio-nav-account">
            {hasAccount ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="studio-account-trigger"><UserRound size={16} /> My workspace <ChevronDown size={14} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuLabel>Your workspace</DropdownMenuLabel>
                  <DropdownMenuItem asChild className="min-h-11"><Link to="/my-simulations"><History size={16} className="mr-2" /> Saved work</Link></DropdownMenuItem>
                  {isAdmin && <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Owner tools</DropdownMenuLabel>
                    <DropdownMenuItem asChild className="min-h-11"><Link to="/portfolio"><FolderKanban size={16} className="mr-2" /> Portfolio manager</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild className="min-h-11"><Link to="/hub"><Network size={16} className="mr-2" /> Internal hub</Link></DropdownMenuItem>
                  </>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled={signingOut} onSelect={() => void handleSignOut()} className="min-h-11"><LogOut size={16} className="mr-2" /> {signingOut ? "Signing out…" : "Sign out"}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : <Link className="studio-signin" to="/auth">Sign in <ArrowUpRight size={14} /></Link>}
          </div>
          <button ref={menuButton} type="button" className="studio-menu-toggle" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} aria-controls="studio-mobile-navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </nav>
        {mobileOpen && (
          <nav id="studio-mobile-navigation" className="studio-mobile-nav" aria-label="Mobile navigation">
            {navLinks.map(link => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}
            <div className="studio-mobile-account">
              {hasAccount ? <>
                <Link to="/my-simulations">Saved work</Link>
                {isAdmin && <><Link to="/portfolio">Portfolio manager</Link><Link to="/hub">Internal hub</Link></>}
                <button type="button" disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? "Signing out…" : "Sign out"}</button>
              </> : <Link to="/auth">Sign in / create an account <ArrowUpRight size={16} /></Link>}
            </div>
          </nav>
        )}
      </header>
    </>
  );
};

export default Navbar;
