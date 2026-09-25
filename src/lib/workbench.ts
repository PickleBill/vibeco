import { invokeAI } from "./invokeAI";
import type {
  GeneralReport,
  GeneralPurpose,
} from "../../supabase/functions/_shared/workbench-types";
import { supabase } from "@/integrations/supabase/client";
import { ensureSession } from "./ensureSession";
import { isLocalPreview } from "./localPreview";

export type Purpose = "build" | GeneralPurpose;
export const purposes: { id: Purpose; label: string; description: string }[] = [
  {
    id: "build",
    label: "Idea or app",
    description: "Shape a concept into a useful product and build brief.",
  },
  {
    id: "research",
    label: "Company or topic",
    description: "Gather evidence, find the gaps, and form a point of view.",
  },
  {
    id: "initiative",
    label: "Business initiative",
    description: "Test the case, map stakeholders, and design a small pilot.",
  },
  {
    id: "decision",
    label: "Decision or disagreement",
    description: "Explore the tradeoffs and choose a constructive next step.",
  },
];
export function parsePurpose(value: string | null): Purpose {
  return purposes.some((p) => p.id === value) ? (value as Purpose) : "build";
}
export async function invokeWorkbench(
  body: Record<string, unknown>,
  signal?: AbortSignal,
) {
  if (isLocalPreview)
    throw new Error(
      "Live analysis is disconnected in this preview. Open a worked example to explore the complete report.",
    );
  if (!(await ensureSession()))
    throw new Error(
      "Your private session could not be started. Your question is still here; please try again.",
    );
  const { data, error } = await invokeAI("workbench", { body, signal });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as { report: GeneralReport };
}
export function reportMarkdown(r: GeneralReport): string {
  return [
    `# ${r.title}`,
    r.question,
    `## Recommendation\n${r.recommendation}`,
    r.summary,
    `## Facts and supplied context\n${r.facts.map((f) => `- ${f.text}${f.sourceIds.length ? ` [${f.sourceIds.join(", ")}]` : " (supplied context)"}`).join("\n")}`,
    `## Assumptions\n${r.assumptions.map((x) => `- ${x}`).join("\n")}`,
    `## Synthetic perspectives\n${r.perspectives.map((p) => `### ${p.name}\n${p.position}\n${p.rationale}`).join("\n\n")}`,
    `## Tensions\n${r.tensions.map((x) => `- ${x}`).join("\n")}`,
    `## Alternatives\n${r.alternatives.map((x) => `- ${x}`).join("\n")}`,
    `## Open questions\n${r.openQuestions.map((x) => `- ${x}`).join("\n")}`,
    `## Next actions\n${r.nextActions.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    `## Handoff prompt\n${r.handoffPrompt}`,
    `## Sources\n${r.sources.map((s) => `- [${s.id}] ${s.title}: ${s.url} (retrieved ${s.retrievedAt})`).join("\n") || "No independent web evidence collected."}`,
    `## Limits\n${r.limitations.map((x) => `- ${x}`).join("\n")}`,
  ].join("\n\n");
}
export function downloadText(
  text: string,
  filename: string,
  type = "text/markdown",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function setSharing(id: string, enabled: boolean) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || session.user.is_anonymous)
    throw new Error("Create an account before sharing a report.");
  const { error } = await supabase.rpc("set_report_sharing", {
    _report_id: id,
    _enabled: enabled,
  });
  if (error) throw new Error("Sharing was not changed. Please try again.");
}
