

## Finding the Plan + Fixing Issues + Skill Expansion

### Where's the Plan?

The updated plan lives in `.lovable/plan.md`. To find it:
- **Desktop**: Click the **Code Editor** icon (top of preview), then navigate to `.lovable/plan.md` in the file tree
- You can also ask me "show me the plan" anytime and I'll read it back to you

---

### What I See Right Now (Screenshot Confirmed)

1. **"One conversation." wraps badly** — the word "conversation." breaks to a second line at your viewport width (1053px), making it read "One conversatio / n." This is because the headline uses `text-5xl sm:text-6xl lg:text-7xl` (4.5rem at lg) which is too large for a 2-column grid at this width. The fix is fluid sizing with `clamp()` or reducing the `lg` breakpoint size.

2. **"TRY THINGS. BREAK THINGS. SHIP THINGS."** — agreed, this is a Facebook-era cliche. Needs a complete replacement. Same eyebrow text exists in all three hero variants.

3. **"One conversation. One live product."** — the headline itself is okay structurally but could be sharper. We should workshop alternatives.

---

### Available Skills from Impeccable

I couldn't access the original impeccable GitHub repo (it appears to be private or moved). Based on the upstream documentation referenced in our existing skill files, you already have **all 9 core skills**:

| Skill | Have it? | Status |
|---|---|---|
| Impeccable (orchestrator) | Yes | v2.0 |
| Shape | Yes | Ready |
| Audit | Yes | Ready |
| Critique | Yes | Ready |
| Polish | Yes | Ready |
| Bolder | Yes | Ready |
| Clarify | Yes | Ready |
| Overdrive | Yes | Ready |
| Onboard | Yes | Ready |

The upstream repo's `reference/` directory contained `craft.md` (the build workflow, now folded into SKILL_IMPECCABLE.md) and the SKILL.md files we've already adapted. **You have the full set.**

What we *don't* have but could create ourselves:
- **Refine** — iterative visual regression testing (before/after screenshot comparison)
- **Rhythm** — page-level section flow and pacing analysis (spacing, density, visual weight alternation)
- **Contrast** — specifically for ensuring typographic and color contrast hierarchy across the full page, not just WCAG minimums

These would be custom VibeCo skills, not from upstream.

---

### Proposed Plan: Fix Immediate Issues + Production Design Push

**Sprint A: Fix the visible bugs (2 files)**

- All three hero variants: replace `text-5xl sm:text-6xl lg:text-7xl` with fluid `clamp()` sizing that doesn't wrap at common viewport widths
- Replace eyebrow "TRY THINGS. BREAK THINGS. SHIP THINGS." with something that actually communicates value (e.g., "IDEA → PRODUCT → REVENUE" or "FROM ZERO TO LIVE")
- Consider headline alternatives. Current "One conversation. One live product." is functional but not provocative enough for the brand personality

**Sprint B: Full Bolder + Critique pass**

Run the Bolder skill across the landing page to break the card-grid monoculture and section monotony. Then re-run Critique to score the updated page. Key targets:
- Services, EverydayFounders, Differentiator — all use identical card grids
- Section rhythm — every section uses the same `py-32 border-t FadeIn` pattern
- Reduce from 13 sections to ~8-9 by merging overlapping content

**Sprint C: Polish + Accessibility**

Fix P1-P3 items from the audit: hard-coded colors, missing aria-labels, skip-to-content, responsive breakpoints on SpeedTimeline.

**Sprint D: Re-audit**

Run Audit + Critique again to measure improvement from baseline 11/20.

---

### Files

| File | Action |
|---|---|
| `src/components/HeroVariantA.tsx` | Fix fluid font sizing, replace eyebrow copy |
| `src/components/HeroVariantB.tsx` | Same fixes |
| `src/components/HeroVariantC.tsx` | Same fixes |

Sprint B-D files TBD based on Bolder skill output.

No backend changes. No migrations.

