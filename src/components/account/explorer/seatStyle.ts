import { Flame, Heart, Maximize2, Minimize2, Shield, Swords, Wrench, type LucideIcon } from "lucide-react";
import type { AgentId } from "./model";

/**
 * An icon per seat. Seats are told apart by icon and name, in ink: color is
 * kept for evidence and live moments. `active` is the selected seat's look.
 */
const ACTIVE = "border-2 border-primary bg-brand-tint";
export const SEAT_STYLE: Record<string, { icon: LucideIcon; color: string; active: string }> = {
  champion: { icon: Flame, color: "text-foreground", active: ACTIVE },
  skeptic: { icon: Shield, color: "text-foreground", active: ACTIVE },
  competitor: { icon: Swords, color: "text-foreground", active: ACTIVE },
  customer: { icon: Heart, color: "text-foreground", active: ACTIVE },
  builder: { icon: Wrench, color: "text-foreground", active: ACTIVE },
};

export function agentIcon(id: AgentId): { icon: LucideIcon; color: string } {
  if (id === "expand") return { icon: Maximize2, color: "text-foreground" };
  if (id === "distill") return { icon: Minimize2, color: "text-foreground" };
  return SEAT_STYLE[id.replace("persona-", "")] ?? SEAT_STYLE.builder;
}
