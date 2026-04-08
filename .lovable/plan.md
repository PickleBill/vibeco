

## Where Things Live and How to Use Them

### Question 1: Where is DESIGN_SYSTEM.md?

It's a file in your **project root** — same level as `package.json` and `README.md`. You can see it in Lovable's **Code Editor** (click the code icon above the preview). It's in the file tree at the top level.

I read it automatically when it's relevant to a prompt. When you say things like "follow the design system" or "audit this component," I pull from that file. It's passive — no special wiring needed.

### Question 2: Quick Commands to Test It

You don't run commands — you prompt me. Here are three test prompts you can paste directly into chat to see the design system in action:

1. **Audit prompt**: *"Audit the Hero component against DESIGN_SYSTEM.md. List any violations."*
   — I'll read both files and flag anti-patterns (e.g., raw colors, uniform spacing, missing fluid typography)

2. **Polish prompt**: *"Polish the StatsBar component following the design system. Fix any anti-pattern violations."*
   — I'll actually edit the component to comply

3. **Build prompt**: *"Add a testimonials section to the landing page. Follow the design system."*
   — I'll build it using the token reference, spacing rules, and anti-patterns as constraints

These are your equivalent of Impeccable's `/audit`, `/polish`, and `/build` slash commands — just expressed as natural language.

### Question 3: Project Knowledge in Lovable (The Bigger Picture)

Lovable has **two built-in knowledge layers** — no markdown files needed:

**Project Knowledge** (per-project)
- **Where**: Click project name (top left) → Settings → Knowledge tab
- **What**: Up to 10,000 characters of instructions I always read for THIS project
- **Use for**: "This app uses VibeCo's design system. Always reference DESIGN_SYSTEM.md for UI work. The AI model for simulations defaults to fast mode (gemini-3-flash). Admin user is bill@courtana.com."

**Workspace Knowledge** (across all your projects)
- **Where**: Avatar (bottom left) → Workspace Settings → Knowledge tab
- **What**: Up to 10,000 characters shared across every project in the workspace
- **Use for**: "Always use semantic color tokens. Never use raw hex. Follow Impeccable Style anti-patterns. Prefer progressive disclosure over modals."

**Priority**: Project knowledge overrides workspace knowledge when they conflict.

### Recommended Setup for VibeCo

**Step 1** — Add Project Knowledge (Settings → Knowledge):
```
This is VibeCo — an AI-powered idea simulation platform.

Design: Follow DESIGN_SYSTEM.md (Impeccable Style adapted for Tailwind/shadcn).
Backend: Lovable Cloud with dual-speed AI (fast=gemini-3-flash, deep=gemini-2.5-pro).
Admin: bill@courtana.com has admin role for viewing all simulations.
Auth: Email-based with Google OAuth.

Key architecture:
- idea_reports: stores simulation results, linked to users via user_id
- simulator_captures: stores session data, linked via report_id
- Thunderdome: post-brief experience (perspectives, expand, distill, refine)
- Status flow: in-progress → brief-complete → thunderdome-active → prompt-ready
```

**Step 2** — Add Workspace Knowledge (for ALL projects):
```
Design principles (Impeccable Style):
- No pure black/white. Tint all neutrals.
- No cards-in-cards. Flatten hierarchy.
- No bounce/elastic easing. Use ease-out or exponential.
- Use clamp() for fluid typography and spacing.
- Progressive disclosure over dumping everything at once.
- Every word earns its place. No redundant copy.
- One primary CTA per viewport.

Always use semantic color tokens from the project's CSS variables.
```

**Step 3** — For other projects, create a project-specific `DESIGN_SYSTEM.md` OR just use project knowledge to describe the design constraints. The MD file approach is better for complex systems (like VibeCo) because it can be longer than 10K chars and lives in version control.

### The Knowledge Stack (How I Access Things)

```text
┌─────────────────────────────┐
│   Your prompt message       │  ← Highest priority
├─────────────────────────────┤
│   Project Knowledge         │  ← Settings → Knowledge
│   (10K chars, this project) │
├─────────────────────────────┤
│   Workspace Knowledge       │  ← Shared across projects
│   (10K chars, all projects) │
├─────────────────────────────┤
│   Codebase files            │  ← DESIGN_SYSTEM.md, README, etc.
│   (I read when relevant)    │
├─────────────────────────────┤
│   Conversation history      │  ← What we've discussed
└─────────────────────────────┘
```

### No Code Changes Needed

This is all configuration. Steps 1 and 2 happen in Lovable's UI settings. The DESIGN_SYSTEM.md file already exists in the repo. The test prompts above are how you exercise the system.

