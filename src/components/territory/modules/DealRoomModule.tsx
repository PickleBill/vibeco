import { Eyebrow } from "../ui";
import type { ModuleProps } from "./types";

/** 04 · Deal Room: A brief the account can correct. (Placeholder; the full view replaces it.) */
export function DealRoomModule(_props: ModuleProps) {
  return (
    <div>
      <Eyebrow>04 · Deal Room</Eyebrow>
      <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em]">A brief the account can correct</h1>
    </div>
  );
}
