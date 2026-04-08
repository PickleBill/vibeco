

## Plan: Create Three Adapted Skill Files in VibeCo (Single Project, No Remix)

### Decision: One Project, One Branch

You're right — keeping it all in VibeCo is the simpler path. The skill files are just markdown reference docs; they don't affect the running app at all. No remix needed. If scope creep ever becomes an issue, you can always remix later. For now, consolidation wins.

### What Gets Created

Three files in the project root, each adapted from the original Impeccable source for Lovable's natural-language prompt model:

**`SKILL_OVERDRIVE.md`** (from your uploaded file)
- Advanced animation and interaction design constraints
- Removes non-viable patterns (WebGPU, WASM, native APIs)
- Keeps: spring physics via framer-motion, scroll-driven animations, View Transitions API, virtual scrolling, reduced-motion handling
- Adds Lovable-specific prompt patterns: "Apply overdrive-level polish to [component]"

**`SKILL_CRITIQUE.md`** (fetched from GitHub)
- UX critique framework with Nielsen heuristic scoring
- "AI slop" detection checklist (stock icons, generic copy, uniform grids)
- Persona-based red flags (accessibility, mobile, cognitive load)
- Prompt pattern: "Critique [page/component] using the critique skill"

**`SKILL_ONBOARD.md`** (fetched from GitHub)
- Progressive disclosure and empty state patterns
- Time-to-value principles, first-run experience design
- Empty state templates that teach the interface
- Prompt pattern: "Design the onboarding for [feature] using the onboard skill"

### Adaptation Rules Applied to All Three

- Template variables (`{{command_prefix}}`, `{{config_file}}`) replaced with natural language
- Slash command references converted to prompt examples
- External file references (`reference/personas.md`) inlined
- Browser automation instructions adapted to "check the preview"
- Tech constraints scoped to Tailwind/shadcn/framer-motion

### Files

| File | Action |
|---|---|
| `SKILL_OVERDRIVE.md` | Create |
| `SKILL_CRITIQUE.md` | Create |
| `SKILL_ONBOARD.md` | Create |

No code changes. No migrations. No runtime impact. These are passive reference documents that I read when you prompt me with skill-specific language.

