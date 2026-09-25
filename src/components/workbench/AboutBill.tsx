import { ArrowUpRight, Linkedin } from "lucide-react";

// Facts here must match the résumé site's ledger (PickleBill/Brick _source/facts.md).
const BRICK_URL = "https://picklebill.github.io/Brick/";
const RESUME_URL = "https://picklebill.github.io/Brick/resume/";
const LINKEDIN_URL = "https://linkedin.com/in/williambricker";
const HEADSHOT_URL = "/bill-headshot.jpg"; // copied from Brick/assets/bb-headshot-li.jpg

const BUILT_WITH = [
  { k: "Built with", v: "Lovable, Claude Code and Codex, working from one repo" },
  { k: "Stack", v: "React + TypeScript on Supabase (Postgres, auth, edge functions)" },
  { k: "Agents", v: "18 edge functions behind one model router that picks a model per task" },
  { k: "Also powers", v: "The ask-me-anything terminal on my résumé site" },
];

const AboutBill = () => (
  <section id="about" className="scroll-mt-20 border-t border-border bg-surface py-20 lg:py-28">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">About Bill</p>
        <div className="mt-6 flex items-center gap-4">
          <img
            src={HEADSHOT_URL}
            alt="Bill Bricker"
            width={64}
            height={64}
            loading="lazy"
            className="h-16 w-16 rounded-full object-cover border border-border"
          />
          <div>
            <p className="font-display text-xl font-semibold text-foreground">Bill Bricker</p>
            <p className="text-sm text-muted-foreground">AI-forward sales &amp; partnerships leader · 3× founder · Raleigh, NC</p>
          </div>
        </div>

        <p className="mt-8 font-display text-2xl sm:text-3xl font-semibold leading-snug text-foreground">
          &ldquo;I close the deals the biggest names in tech say yes to.&rdquo;
        </p>
        <p className="mt-5 max-w-xl text-muted-foreground">
          I founded Dreamship and closed Google as a partner in year one. VibeCo is the AI workbench I built to
          multiply my own output. I use it to pressure-test ideas, get smart on a company before a conversation,
          and think through decisions before I spend time on them.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={BRICK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Résumé &amp; proof of work
            <ArrowUpRight size={15} aria-hidden />
          </a>
          <a
            href={RESUME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            Résumé
            <ArrowUpRight size={15} aria-hidden />
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            <Linkedin size={15} aria-hidden />
            LinkedIn
          </a>
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface-elevated p-6 sm:p-7 shadow-warm self-start">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">How it&rsquo;s built</p>
        <dl className="mt-5 divide-y divide-border">
          {BUILT_WITH.map((row) => (
            <div key={row.k} className="grid grid-cols-[7.5rem_1fr] gap-4 py-3 text-sm">
              <dt className="text-muted-foreground">{row.k}</dt>
              <dd className="text-foreground">{row.v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">
          40+ apps across 31 repos, built &amp; shipped solo.
        </p>
      </div>
    </div>
  </section>
);

export default AboutBill;
