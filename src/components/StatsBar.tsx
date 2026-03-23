import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";

const stats = [
  { value: 16, suffix: "+", label: "Live products shipped" },
  { value: 48, prefix: "< ", suffix: "hrs", label: "Avg time to launch" },
  { value: 7, suffix: "", label: "Industries" },
  { value: 0, prefix: "$", suffix: " upfront", label: "On rev-share builds" },
];

const CountUp = ({ target, prefix = "", suffix = "", active }: { target: number; prefix?: string; suffix?: string; active: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target === 0) { setCount(0); return; }
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [active, target]);

  return <span>{prefix}{count}{suffix}</span>;
};

const StatsBar = () => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="border-t border-b border-border py-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-3xl font-black text-primary">
                <CountUp target={stat.value} prefix={stat.prefix} suffix={stat.suffix} active={isInView} />
              </p>
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-wide mt-1">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
