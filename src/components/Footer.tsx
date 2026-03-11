const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="max-w-7xl mx-auto px-6 lg:px-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="font-display text-lg font-black text-foreground tracking-tight">
            VibeCo
          </p>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            AI-native product builds for founders with real conviction.
          </p>
        </div>
        <div className="flex gap-6">
          {[
            { label: "Thesis", href: "#thesis" },
            { label: "Services", href: "#services" },
            { label: "Builds", href: "#builds" },
            { label: "Contact", href: "#contact" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
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

export default Footer;
