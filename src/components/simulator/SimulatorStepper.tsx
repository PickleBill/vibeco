import { useEffect, useState } from "react";

export type SimPhase = "input" | "analyzing" | "brief" | "final";

interface Props {
  phase: SimPhase;
}

const STAGES = [
  { n: 1, label: "Describe" },
  { n: 2, label: "Analyze" },
  { n: 3, label: "Verdict" },
  { n: 4, label: "Build prompt" },
  { n: 5, label: "Next actions" },
] as const;

// Within the final report, anchors map to spine stages.
const ANCHOR_STAGE: Array<{ id: string; stage: number }> = [
  { id: "fr-verdict", stage: 3 },
  { id: "fr-brief", stage: 3 },
  { id: "fr-prompt", stage: 4 },
  { id: "fr-stress-test", stage: 4 },
  { id: "fr-actions", stage: 5 },
];

function baseStage(phase: SimPhase): number {
  if (phase === "input") return 1;
  if (phase === "analyzing" || phase === "brief") return 2;
  return 3; // final — refined by scroll
}

const SimulatorStepper = ({ phase }: Props) => {
  const [active, setActive] = useState<number>(() => baseStage(phase));

  useEffect(() => {
    if (phase !== "final") {
      setActive(baseStage(phase));
      return;
    }

    const computeFromScroll = () => {
      const threshold = window.innerHeight * 0.35;
      let current = 3;
      for (const { id, stage } of ANCHOR_STAGE) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) current = stage;
      }
      setActive(current);
    };

    computeFromScroll();
    window.addEventListener("scroll", computeFromScroll, { passive: true });
    window.addEventListener("resize", computeFromScroll);
    return () => {
      window.removeEventListener("scroll", computeFromScroll);
      window.removeEventListener("resize", computeFromScroll);
    };
  }, [phase]);

  return (
    <nav aria-label="Progress" className="mb-8">
      {/* Desktop: labeled stepper */}
      <ol className="hidden md:flex items-center justify-center gap-0">
        {STAGES.map((s, i) => {
          const isActive = s.n === active;
          const isDone = s.n < active;
          return (
            <li key={s.n} className="flex items-center">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold transition-all duration-300 ${
                    isActive
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-400/30"
                      : isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400/80"
                      : "border-border/50 bg-card/40 text-muted-foreground/60"
                  }`}
                >
                  {isDone ? "✓" : s.n}
                </span>
                <span
                  className={`text-xs transition-colors duration-300 ${
                    isActive
                      ? "text-emerald-300 font-semibold"
                      : isDone
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <span
                  className={`mx-3 h-px w-8 transition-colors duration-300 ${
                    s.n < active ? "bg-emerald-500/40" : "bg-border/40"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact progress dots */}
      <div className="flex md:hidden items-center justify-center gap-3">
        <span className="text-[11px] font-medium text-emerald-300 tabular-nums">
          {STAGES[active - 1]?.label}
        </span>
        <div className="flex items-center gap-1.5" role="presentation">
          {STAGES.map((s) => {
            const isActive = s.n === active;
            const isDone = s.n < active;
            return (
              <span
                key={s.n}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "w-5 bg-emerald-400"
                    : isDone
                    ? "w-1.5 bg-emerald-500/50"
                    : "w-1.5 bg-border/60"
                }`}
              />
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums">
          {active}/{STAGES.length}
        </span>
      </div>
    </nav>
  );
};

export default SimulatorStepper;
