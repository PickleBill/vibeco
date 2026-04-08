

## Impeccable Style Integration — What's Possible

### What Impeccable Is

Impeccable is a collection of **design rules and slash commands** (like `/polish`, `/audit`, `/typeset`) built for local AI coding tools — Cursor, Claude Code, Gemini CLI, VS Code Copilot, etc. It works by placing dotfiles (`.cursor/`, `.claude/`, etc.) in your project root that those tools read as instruction files.

### Why It Can't Plug In Directly

Lovable doesn't use any of those dotfile-based skill systems. There's no `.cursor/rules/` or `.claude/commands/` equivalent here — Lovable's AI reads the codebase and conversation context directly. The `npx skills add` command is for local CLI environments, not Lovable's cloud editor.

### What We CAN Do (Two Approaches)

**Approach A: Extract the design principles into our project**

Impeccable's real value is its curated design anti-patterns and rules. We can:

1. Create a `DESIGN_SYSTEM.md` file in the project root containing the key Impeccable rules adapted to our stack (Tailwind + shadcn)
2. Include the anti-patterns that are most relevant to VibeCo:
   - No pure black/white (we already use tinted neutrals)
   - No cards-in-cards, no identical card grids
   - No bounce/elastic easing
   - Progressive disclosure patterns
   - Fluid typography with `clamp()`
   - Asymmetric layouts over center-everything defaults
3. This file would serve as a reference doc that I read when making UI changes, and you can reference it in prompts ("follow the design system")

**Approach B: Use it in your local dev workflow**

If you ever pull the repo locally and use Cursor or Claude Code:
1. Run `npx skills add pbakaus/impeccable` in the cloned project
2. The `.cursor/` or `.claude/` folders get added
3. Those tools will then follow the Impeccable rules when editing the same codebase
4. Changes push to GitHub and sync back to Lovable

**Recommendation:** Do both. Approach A gives us the design guardrails inside Lovable right now. Approach B gives you the full slash command experience when working locally.

### Implementation (Approach A)

| File | Action |
|---|---|
| `DESIGN_SYSTEM.md` | Create — extracted Impeccable rules adapted for Tailwind/shadcn, plus VibeCo-specific tokens |

This is a single file creation. No code changes, no migrations. It becomes a living reference for all future UI work on this project.

For other projects: you'd copy this same `DESIGN_SYSTEM.md` pattern, or use Approach B locally with `npx skills add`.

