import { Flame, Heart, Maximize2, Minimize2, Shield, Swords, Wrench, type LucideIcon } from "lucide-react";
import type { AgentId } from "./model";

/** Icons and tints per seat, as the simulator's persona cards use them. */
export const SEAT_STYLE: Record<string, { icon: LucideIcon; color: string; active: string }> = {
  champion: { icon: Flame, color: "text-primary", active: "bg-primary/10 border-primary/40" },
  skeptic: { icon: Shield, color: "text-destructive", active: "bg-destructive/10 border-destructive/40" },
  competitor: { icon: Swords, color: "text-accent-foreground", active: "bg-accent/60 border-accent-foreground/30" },
  customer: { icon: Heart, color: "text-amber-600", active: "bg-amber-50 border-amber-400/60" },
  builder: { icon: Wrench, color: "text-muted-foreground", active: "bg-muted/70 border-muted-foreground/30" },
};

export function agentIcon(id: AgentId): { icon: LucideIcon; color: string } {
  if (id === "expand") return { icon: Maximize2, color: "text-primary" };
  if (id === "distill") return { icon: Minimize2, color: "text-primary" };
  return SEAT_STYLE[id.replace("persona-", "")] ?? SEAT_STYLE.builder;
}
