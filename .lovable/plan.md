

## Three Deliverables: Simulator Critique, Clarify Skill, and Housekeeping

---

### About Your Missing Files

The three skill files (`SKILL_OVERDRIVE.md`, `SKILL_CRITIQUE.md`, `SKILL_ONBOARD.md`) are still in the project root — I confirmed them in the file tree. They sit right below `DESIGN_SYSTEM.md`. The code editor sometimes collapses or filters the view depending on your search term (you were searching for "skill" inside `DESIGN_SYSTEM.md`). Clear the search or scroll up in the file tree and you should see them.

### About DESIGN_SYSTEM.md

Keep it. It is not redundant — it serves a different purpose than the skills. The skills tell me *how to do specific tasks* (critique, polish, clarify). The design system tells me *what our visual rules are* (token names, anti-patterns, card rules, type hierarchy). The skills actually reference the design system as their foundation. Think of it as: DESIGN_SYSTEM = the rulebook, SKILL files = specific plays from that rulebook.

### About the Clarify Skill from GitHub

I successfully fetched the source from `github.com/pbakaus/impeccable/source/skills/clarify/SKILL.md`. It was not at the path we first tried (`skills/clarify`) — the repo reorganized into `source/skills/`. I have the full content and will adapt it the same way we did the other three.

---

## Deliverable 1: SKILL_CLARIFY.md (Create)

Adapted from the Impeccable Clarify skill. Changes from the original:
- Remove `{{command_prefix}}` template variables and `frontend-design` / `teach-impeccable` cross-references (we use `DESIGN_SYSTEM.md` instead)
- Remove YAML frontmatter
- Add Lovable-specific trigger phrases and prompt examples
- Keep all the concrete before/after copy patterns (error messages, CTAs, empty states, loading states, etc.)
- Add VibeCo-specific context (audience = non-technical founders, tone = confident but approachable)

### How to Use the Clarify Skill (and Any Skill)

You prompt me with natural language that includes the skill name:
- *"Clarify the copy on the simulator input page"*
- *"Run the clarify skill on the My Simulations empty state"*
- *"Clarify error messages across the app"*

I read the relevant `SKILL_*.md` file, apply its framework to the target, and present findings + rewrites. No setup, no commands to run — just say it.

---

## Deliverable 2: Simulator Flow Critique (Critique + Onboard Skills Applied)

Full end-to-end analysis of the simulator flow for new and returning users.

### Nielsen Heuristic Scores

| Heuristic | Score | Notes |
|---|---|---|
| 1. System visibility | 3/4 | Round stepper is solid. But no progress during "analyzing" (no % or stage indicator beyond rotating messages). Loading time estimate is vague ("10-15 seconds" vs actual). |
| 2. Real-world match | 3/4 | "Thunderdome" is fun but jargon. "Distill" / "Expand" are abstract. Non-founders may not know "revenue model" vs "pricing." |
| 3. User control | 2/4 | No way to go back to a previous round's brief. "Restart" is nuclear — clears everything. No undo for highlight/anti-highlight. No cancel during analysis. |
| 4. Consistency | 3/4 | "Generate My Report Now" appears twice (top banner + bottom). CTA labels vary: "Simulate This Idea" → "Refine My Brief" → "Generate Report Now." |
| 5. Error prevention | 2/4 | Textarea accepts Enter-to-submit with no confirmation. 10-char minimum has no visible feedback. No warning before restart clears 20 minutes of work. |
| 6. Recognition > recall | 3/4 | Highlight/flag icons (sparkle/flag) are clear. But the email unlock purpose is not explained until you reach it. |
| 7. Flexibility | 3/4 | Fast/deep toggle is great. Skip-to-final is great. But no way to selectively re-run one section. |
| 8. Aesthetic & minimal | 2/4 | Brief phase shows questions AND full brief simultaneously — heavy cognitive load. Two identical "Generate Report Now" CTAs compete. |
| 9. Error recovery | 2/4 | API errors show a toast and dump user back to input or brief with no saved progress from that attempt. |
| 10. Help & docs | 1/4 | No tooltips explaining what highlights do. No explanation of the round system. No help for what "Deep thinking" means concretely. |

**Overall: 24/40** — Strong core flow, weak on guidance and error recovery.

### Priority Issues

**P0 — Fix Now**
1. **No cancel button during analysis.** If the API hangs (30-60s in deep mode), users are trapped staring at a spinner with no escape.
2. **Restart has no confirmation.** One tap destroys an entire session with no undo.
3. **No visible minimum-length feedback on idea input.** Users type 8 characters, hit Enter, nothing happens. No error message, no character count turning red.

**P1 — Fix Soon**
4. **Cognitive overload in brief phase.** Questions and the full brief render together in one long scroll. The brief is below the fold — many users may never scroll to see it. Consider collapsing the brief behind an "expand" or showing questions first, brief second with a tab/toggle.
5. **Email unlock value proposition is unclear.** The banner says "save your report" but users don't know what they're losing without it. Spell out: "Unlock your personalized Lovable prompt + PDF export + permanent link."
6. **No back navigation between rounds.** Once you answer and move to round 2, round 1's brief is gone. Users should be able to review previous rounds.
7. **Duplicate "Generate Report Now" CTA.** The top banner and bottom button say the same thing. The top one should be the primary; the bottom should be secondary ("Refine My Brief" as primary, "Skip to Report" as secondary).

**P2 — Improve**
8. **"Thunderdome" naming.** Fun but alienating for non-technical users. Consider "Stress Test" or "Deep Dive" — or at minimum, add a subtitle explaining what it does.
9. **Loading messages don't match actual progress.** They cycle on a timer, not tied to real stages. If analysis takes 45 seconds, users see the same 6 messages loop twice.
10. **My Simulations empty state is functional but bland.** It has the icon + CTA per SKILL_ONBOARD, but no example simulation to show what a completed one looks like. Adding a "See an example" link would reduce uncertainty.
11. **The "PDF report — unlocks at completion" pill at the top of /simulate is orphaned.** It's outside the SimulatorShell, so it persists even after completion when the PDF is already available. Confusing.

**P3 — Polish**
12. **Toast messages are generic.** "Saved! Your full report is unlocked." doesn't tell users what to do next. Better: "Report unlocked. Scroll down to copy your Lovable prompt."
13. **Deep/Quick mode toggle has no explanation.** A tooltip or subtitle like "Deep: 30-60s, more thorough analysis" would help.
14. **Session resume toast fires even for fresh visits** if localStorage has stale data within TTL.

### Onboarding Gaps (New Users)

- **First visit to /simulate:** No orientation. Users land on a blank textarea. The heading "Describe your wildest idea" is strong, but there's no example of what a completed simulation looks like. Consider a "See a sample report" link.
- **First visit to /my-simulations when logged in with zero simulations:** The empty state is decent but could include a sample card showing what a completed simulation card looks like.
- **No explanation of the round system.** Users don't know they'll get 3 rounds, that questions are optional, or that they can skip ahead. A one-sentence explainer below the textarea would set expectations.
- **Highlight/flag system has zero onboarding.** Users see sparkle and flag icons with no tooltip explaining their purpose or impact on the final prompt.

### Onboarding Gaps (Returning Users)

- **Draft resume toast is subtle.** "Resumed your previous session" as a brief toast can be missed. Consider an inline banner: "You have an in-progress simulation. [Continue] or [Start fresh]"
- **My Simulations → resume flow is smooth** (clicking a card takes you to `/simulate?id=X`). No issues here.
- **No indicator of what changed since last visit** on resumed simulations.

---

## Deliverable 3: Implementation Plan

### Files

| File | Action |
|---|---|
| `SKILL_CLARIFY.md` | Create — adapted from Impeccable source |

No code changes in this pass. The critique findings above are your progressive backlog — you can feed them to me one at a time ("Fix P0 issue 1: add a cancel button during analysis") and I'll implement each one.

### Suggested Order of Attack

1. Start with P0s (cancel button, restart confirmation, input validation feedback)
2. Then P1s (cognitive load fix, email unlock copy, back navigation)
3. Use the Clarify skill on the simulator copy once structure is settled
4. Apply Onboard skill to the first-visit experience last

