import { Eyebrow } from "../ui";
import type { ModuleProps } from "./types";

/** 05 · Lookalikes: More like your customers. (Placeholder; the full view replaces it.) */
export function LookalikesModule(_props: ModuleProps) {
  return (
    <div>
      <Eyebrow>05 · Lookalikes</Eyebrow>
      <h1 className="mt-2 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em]">More like your customers</h1>
    </div>
  );
}
