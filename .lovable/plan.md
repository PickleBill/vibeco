

## Plan: Top-Level Impeccable Skill + Design Context + Reference Library

### What's Changing

Your current setup has four individual skill files (Overdrive, Critique, Onboard, Clarify) and a DESIGN_SYSTEM.md that was a good v1 but is now outdated compared to the upstream impeccable v2.0. The missing piece is the **orchestrator** -- the top-level `/impeccable` command that ties everything together and establishes your project's Design Context so every skill produces consistent, non-generic output.

Three deliverables:

---

### 1. Create `.impeccable.md` (Design Context)

This is what the `/impeccable teach` flow produces. It's the single source of truth that every skill reads before doing work. Based on your answers:

```text
## Design Context

### Users
Non-technical domain experts and high-agency founders.
Using VibeCo to go from a plain-English idea to a live, testable product.
Context: on their laptop, excited but skeptical, often after hours.

### Brand Personality
Bold, experimental, provocative.
Not "tech bro startup." Not "enterprise committee."
Talks like a confident collaborator who's done this 50 times.

### Aesthetic Direction
Cinematic dark mode. Matte charcoal, electric accents.
Anti-references: generic SaaS templates, gradient-everything startups,
corporate blue-and-white, anything that screams "AI made this."
Reference: bioastra.org (pending -- site didn't load, revisit).
Theme: dark (justified -- evening/focused use, creative energy).

### Design Principles
1. Provocation over polish -- challenge assumptions, don't decorate
2. Earned complexity -- start bare, reveal depth through interaction
3. No monoculture -- vary layouts, fonts, and compositions across sections
4. Every element justifies its existence -- no decorative filler
5. Speed is the brand -- the interface should feel as fast as the product
```

**File:** `.impeccable.md` (project root)

---

### 2. Rewrite `DESIGN_SYSTEM.md` as `SKILL_IMPECCABLE.md`

Replace the current DESIGN_SYSTEM.md with a proper adaptation of the upstream impeccable v2.0 SKILL.md. The current file is missing:

- The **Context Gathering Protocol** (check `.impeccable.md` first, then ask)
- The **Font Anti-Attractor Procedure** (the 4-step process to avoid monoculture fonts)
- The **Craft Mode** flow (shape -> load references -> build -> visually iterate -> present)
- The **Teach Mode** flow (explore codebase -> ask questions -> write Design Context)
- The **AI Slop Test** as a formal checkpoint
- The **Visual Details bans** (side-stripe borders, gradient text as CSS patterns)
- OKLCH color guidance (we currently use HSL -- note this as a future migration)

Structure of the new file:

```text
SKILL_IMPECCABLE.md
├── Context Gathering Protocol (reads .impeccable.md)
├── Design Direction (bold aesthetic commitment)
├── Frontend Aesthetics Guidelines
│   ├── Typography (with font anti-attractor procedure)
│   ├── Color & Theme (OKLCH note, 60-30-10 rule)
│   ├── Layout & Space (4pt scale, gap over margins)
│   ├── Visual Details (2 hard CSS bans)
│   ├── Motion (transform+opacity only)
│   ├── Interaction (progressive disclosure)
│   ├── Responsive (container queries)
│   └── UX Writing (earn every word)
├── The AI Slop Test
├── VibeCo Token Reference (migrated from current file)
├── Component Patterns (migrated from current file)
├── Craft Mode (shape -> references -> build -> iterate)
├── Teach Mode (explore -> ask -> write context)
└── Skill Index (links to all SKILL_*.md files)
```

The old DESIGN_SYSTEM.md gets deleted (replaced by this file). All existing skills already say "Reference DESIGN_SYSTEM.md" -- we'll update those references to point to SKILL_IMPECCABLE.md.

**Files:** Create `SKILL_IMPECCABLE.md`, delete `DESIGN_SYSTEM.md`, update references in `SKILL_CRITIQUE.md`, `SKILL_OVERDRIVE.md`, `SKILL_ONBOARD.md`, `SKILL_CLARIFY.md`

---

### 3. Add High-Value Skills from Impeccable Repo

Beyond the 4 we have, these are the most useful for VibeCo's current needs:

| Skill | What it does | Why VibeCo needs it |
|---|---|---|
| **Shape** | Pre-build design brief (used by Craft mode) | Prevents building before thinking |
| **Audit** | Technical code-level design check (vs Critique which is UX-level) | Catches raw colors, missing tokens, anti-pattern CSS |
| **Polish** | Final-pass refinement on a finished component | The "last 10%" after a feature ships |
| **Bolder** | Pushes safe designs toward more distinctive choices | Fights the "every section looks the same" problem |

Each gets adapted as a `SKILL_*.md` file following the same pattern as the existing four.

**Files:** `SKILL_SHAPE.md`, `SKILL_AUDIT.md`, `SKILL_POLISH.md`, `SKILL_BOLDER.md`

---

### How You'll Use This

After implementation, your workflow becomes:

1. **"Run impeccable teach"** -- updates `.impeccable.md` if your brand/audience changes
2. **"Shape [feature]"** -- produces a design brief before any code is written
3. **"Build [feature] following the impeccable skill"** -- I read `.impeccable.md` + `SKILL_IMPECCABLE.md`, load relevant references, build, then visually iterate
4. **"Audit [component]"** -- technical CSS/token check
5. **"Critique [page]"** -- holistic UX/Nielsen evaluation
6. **"Polish [component]"** -- final refinement pass
7. **"Clarify the copy on [target]"** -- copy rewrite
8. **"Push [component] into overdrive"** -- extraordinary interaction polish
9. **"Make [component] bolder"** -- fight safe/generic choices

All skills read `.impeccable.md` for context, so they all produce output consistent with your brand.

---

### Files Summary

| File | Action |
|---|---|
| `.impeccable.md` | Create -- Design Context |
| `SKILL_IMPECCABLE.md` | Create -- top-level orchestrator |
| `DESIGN_SYSTEM.md` | Delete -- replaced by SKILL_IMPECCABLE.md |
| `SKILL_CRITIQUE.md` | Modify -- update reference |
| `SKILL_OVERDRIVE.md` | Modify -- update reference |
| `SKILL_ONBOARD.md` | Modify -- update reference |
| `SKILL_CLARIFY.md` | Modify -- update reference |
| `SKILL_SHAPE.md` | Create |
| `SKILL_AUDIT.md` | Create |
| `SKILL_POLISH.md` | Create |
| `SKILL_BOLDER.md` | Create |

No code changes. No backend changes. No migrations. This is pure design infrastructure.

