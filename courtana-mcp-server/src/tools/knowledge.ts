import { readFile } from "fs/promises";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Knowledge tools — read-only access to organizational knowledge.
 * These let any Claude Code session query Courtana's project registry,
 * design systems, and skill files.
 */

const VIBECO_ROOT = join(process.cwd(), "..");

// ─── Project Registry ───

export async function getProjectRegistry(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("project_registry")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch project registry: ${error.message}`);
  return data || [];
}

// ─── Project Context ───

export async function getProjectContext(projectName: string) {
  // For now, only VibeCo is available locally. Others will be added as the MCP
  // server gains access to more repos.
  if (projectName.toLowerCase() === "vibeco") {
    const claudeMd = await safeReadFile(join(VIBECO_ROOT, "CLAUDE.md"));
    const impeccable = await safeReadFile(join(VIBECO_ROOT, ".impeccable.md"));
    const plan = await safeReadFile(join(VIBECO_ROOT, ".lovable", "plan.md"));

    return {
      project: "vibeco",
      claude_md: claudeMd,
      impeccable_context: impeccable,
      strategic_plan: plan,
    };
  }

  return { project: projectName, error: `Project "${projectName}" not available locally yet. Add it to the MCP server configuration.` };
}

// ─── Design System ───

export async function getDesignSystem(brand: string) {
  const impeccable = await safeReadFile(join(VIBECO_ROOT, ".impeccable.md"));

  // Check for brand-specific design system files
  const designSystemPath = join(VIBECO_ROOT, `${brand.toUpperCase()}_DESIGN_SYSTEM.md`);
  const brandSystem = await safeReadFile(designSystemPath);

  // Fallback to the generic DESIGN_SYSTEM.md
  const genericSystem = await safeReadFile(join(VIBECO_ROOT, "DESIGN_SYSTEM.md"));

  return {
    brand,
    impeccable_context: impeccable,
    brand_design_system: brandSystem || null,
    generic_design_system: genericSystem || null,
    note: !brandSystem && !genericSystem
      ? "No design system file found. Consider creating DESIGN_SYSTEM.md (referenced by all SKILL files)."
      : undefined,
  };
}

// ─── Skill Files ───

export async function getSkill(skillName: string) {
  // Normalize: "audit" → "SKILL_AUDIT.md", "SKILL_AUDIT" → "SKILL_AUDIT.md"
  const normalized = skillName.toUpperCase().startsWith("SKILL_")
    ? `${skillName.toUpperCase()}.md`
    : `SKILL_${skillName.toUpperCase()}.md`;

  const content = await safeReadFile(join(VIBECO_ROOT, normalized));

  if (!content) {
    // List available skills
    const { readdir } = await import("fs/promises");
    const files = await readdir(VIBECO_ROOT);
    const skills = files.filter((f: string) => f.startsWith("SKILL_") && f.endsWith(".md"));
    return { error: `Skill "${skillName}" not found. Available: ${skills.join(", ")}` };
  }

  return { skill: normalized, content };
}

// ─── Search Knowledge ───

export async function searchKnowledge(query: string) {
  const { readdir } = await import("fs/promises");
  const files = await readdir(VIBECO_ROOT);
  const knowledgeFiles = files.filter(
    (f: string) => f.endsWith(".md") && !f.startsWith("node_modules"),
  );

  const results: { file: string; matches: string[] }[] = [];

  for (const file of knowledgeFiles) {
    const content = await safeReadFile(join(VIBECO_ROOT, file));
    if (!content) continue;

    const lines = content.split("\n");
    const matchingLines = lines.filter((line: string) =>
      line.toLowerCase().includes(query.toLowerCase()),
    );

    if (matchingLines.length > 0) {
      results.push({ file, matches: matchingLines.slice(0, 5) }); // top 5 matches per file
    }
  }

  return { query, results, files_searched: knowledgeFiles.length };
}

// ─── Helpers ───

async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}
