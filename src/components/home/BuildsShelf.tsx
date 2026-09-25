import { ArrowUpRight } from "lucide-react";
import FadeIn from "../FadeIn";

// Live builds shipped with the same question → brief → build-prompt loop.
// Kept from the original homepage; other sites link here (#builds, #projects).
const projects = [
  {
    name: "Courtana",
    desc: "AI-powered async coaching platform — delivers your methodology to every student, every session.",
    url: "https://courtanacoach.lovable.app",
    category: "Sports Tech",
    thumbnail: "/builds/courtana.png",
  },
  {
    name: "LitiGator AI",
    desc: "AI-powered mass arbitration intelligence — win more class action cases with predictive analytics.",
    url: "https://litigator.lovable.app",
    category: "Legal Tech",
    thumbnail: "/builds/litigator.png",
  },
  {
    name: "NauticSim",
    desc: "LNG carrier digital twin simulator for decarbonization, CII compliance, and voyage optimization.",
    url: "https://naughtydata.lovable.app",
    category: "Maritime / Energy",
    thumbnail: "/builds/nauticsim.png",
  },
  {
    name: "State Policy Partners",
    desc: "Government affairs simplified — track legislation, manage advocacy campaigns, and connect with policymakers.",
    url: "https://lobbyhobby.lovable.app",
    category: "GovTech",
    thumbnail: "/builds/statepolicy.png",
  },
  {
    name: "SizzleAI",
    desc: "AI sous chef — real-time computer vision watches your pan and guides you to a perfect meal, hands-free.",
    url: "https://sous-chef-vision.lovable.app",
    category: "Food Tech / AI",
    thumbnail: "/builds/sizzleai.png",
  },
  {
    name: "HeadsUp",
    desc: "ML-powered edge cameras that prevent injuries and eliminate unplanned downtime in industrial facilities.",
    url: "https://headsuptime.lovable.app",
    category: "Industrial Safety",
    thumbnail: "/builds/headsup.png",
  },
  {
    name: "Freakshow",
    desc: "Next-gen haptic pickleball paddles with neural-grip sensors and pro performance tech.",
    url: "https://freak-flow-hub.lovable.app",
    category: "Sports / E-Commerce",
    thumbnail: "/builds/freakshow.png",
  },
  {
    name: "RAUM",
    desc: "Luxury real estate platform with home valuations, neighborhood intelligence, and premium marketing.",
    url: "https://unicorse.lovable.app",
    category: "Real Estate",
    thumbnail: "/builds/raum.png",
  },
  {
    name: "PicklePro Draft",
    desc: "Talent scouting and brand growth platform for pickleball's rising stars and mentors.",
    url: "https://audition.lovable.app",
    category: "Sports / Creator",
    thumbnail: "/builds/picklepro.png",
  },
  {
    name: "The Load",
    desc: "Gamified household task draft for couples — score brownie points and settle the score.",
    url: "https://theload.lovable.app",
    category: "Lifestyle",
    thumbnail: "/builds/theload.png",
  },
  {
    name: "FactFudge",
    desc: "The Site About Nothing — AI serves real and fake facts on any topic. You guess which is which.",
    url: "https://factfudge.lovable.app",
    category: "Entertainment",
    thumbnail: "/builds/factfudge.png",
  },
  {
    name: "Green Paws",
    desc: "Premium lawn care platform for Raleigh & Wake County with service booking and before/after showcases.",
    url: "https://greenpaws.lovable.app",
    category: "Local Services",
    thumbnail: "/builds/greenpaws.png",
  },
  {
    name: "Raleigh Crafting",
    desc: "Handmade resin art, creative workshops, pop-up markets, and hosted craft experiences.",
    url: "https://raleighcrafting.lovable.app",
    category: "Community",
    thumbnail: "/builds/raleighcrafting.png",
  },
  {
    name: "Moore Life & Wellness",
    desc: "Compassionate virtual therapy practice for teens and adults across North Carolina.",
    url: "https://mooremental.lovable.app",
    category: "Health & Wellness",
    thumbnail: "/builds/moorelife.png",
  },
];

const BuildsShelf = () => (
  <section id="builds" className="scroll-mt-20 border-t border-border py-20 lg:py-28">
    {/* Old anchor kept for inbound links */}
    <span id="projects" className="block scroll-mt-20" aria-hidden />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Built with this workflow
      </p>
      <h2 className="mt-4 max-w-2xl font-display text-3xl sm:text-4xl font-bold text-foreground">
        Questions that turned into live builds.
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Prototypes and apps that went from a rough question to a brief, a build prompt, and a working site. Every card opens a live build.
      </p>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {projects.map((p, i) => (
          <FadeIn key={p.name} delay={(i % 4) * 0.04}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface-elevated shadow-warm transition hover:border-primary/40 hover:shadow-warm-lg"
            >
              <div className="aspect-[16/10] overflow-hidden border-b border-border bg-muted">
                <img
                  src={p.thumbnail}
                  alt={`${p.name} screenshot`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{p.category}</p>
                <p className="mt-1.5 flex items-center justify-between gap-2 font-display text-base font-semibold text-foreground">
                  {p.name}
                  <ArrowUpRight size={15} className="shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            </a>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);

export default BuildsShelf;
