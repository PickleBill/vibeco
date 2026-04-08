
## Part 1: Clarify Simulator Input Page (Implement Now)

### Copy Audit — IdeaInput.tsx

| # | Element | Before | After | Why |
|---|---------|--------|-------|-----|
| 1 | Eyebrow | "AI Idea Simulator" | "AI Idea Simulator" | ✓ Clear, keep |
| 2 | Headline | "Describe your wildest idea." | "Describe your wildest idea." | ✓ Strong, keep |
| 3 | Subhead | "We'll analyze it, ask smart questions, then generate a ready-to-build prompt." | "Get an AI business brief, stress-test your assumptions, and walk away with a build-ready prompt." | Front-loads the *outcome*, not the process. "Ask smart questions" is vague. |
| 4 | Placeholder | "An app that lets dog owners find and book verified pet sitters..." | ✓ Keep — it's a realistic example, exactly what the clarify skill recommends |
| 5 | Validation hint | "Describe your idea in at least 10 characters so we have enough to work with." | "Add a bit more detail — we need at least 10 characters." | Shorter, warmer, less robotic |
| 6 | "Press Enter to submit" | Static label | "Enter ↵ to simulate" | Clearer action, shorter |
| 7 | CTA button | "Simulate This Idea" | "Simulate This Idea" | ✓ Strong verb + object, keep |

### Copy Audit — SimulatorShell.tsx (analyzing phase)

| # | Before | After | Why |
|---|--------|-------|-----|
| 8 | "Deep analysis takes 30-60 seconds" | "Deep mode — usually 30-60 seconds" | Shorter, scan-friendly |
| 9 | "This takes about 10-15 seconds" | "Quick mode — about 10-15 seconds" | Matches the toggle label |

### Copy Audit — FollowUpQuestions.tsx

| # | Before | After | Why |
|---|--------|-------|-----|
| 10 | "Want a sharper analysis? (optional)" | "Sharpen your analysis (optional)" | Verb-first, action-oriented |
| 11 | "Answer any of these to help us refine your brief, or write in your own direction." | "Answer any question, write your own take, or skip ahead." | One idea per clause, shorter |
| 12 | "Refine My Brief" | "Refine Brief" | Drop "My" — every element is already yours |
| 13 | "Skip to Report" | "Skip to Report" | ✓ Clear, keep |
| 14 | "✦ We have enough context for a strong report. Feel free to skip ahead." | "✦ Strong signal — your report will be solid. Skip ahead anytime." | Front-loads the confidence |

### Copy Audit — IdeaBrief.tsx

| # | Before | After | Why |
|---|--------|-------|-----|
| 15 | "Save your progress & unlock the full report" | "Unlock your build prompt" | Front-loads the high-value item |
| 16 | "Get your custom Lovable prompt, PDF export, and a permanent shareable link to this report." | "Your personalized build prompt, PDF export, and a shareable link — all yours." | Shorter, scans better |
| 17 | "Want to save this analysis?" | "Save this analysis" | Verb-first |
| 18 | "Enter your email to save progress, export as PDF, and get a shareable link." | "Save progress, export PDF, and share via link." | Half the words, same info |
| 19 | "Here's what we see. Answer the questions above to go deeper." | "Here's what we found. Answer questions to go deeper." | Tighter |
| 20 | "Sharper analysis based on your choices. Keep refining above." | "Updated based on your input. Keep refining or skip to your report." | Adds a clear next action |

---

## Part 2: Full Website Copy Audit (Implement Now)

### Hero (all variants)

| # | Before | After | Why |
|---|--------|-------|-----|
| 21 | "You describe it, we build it — powered by AI, driven by obsession. No dev team needed. No six-figure budget. Just your idea and our hands on the keyboard." | "You describe it, we build it. No dev team. No six-figure budget. Your idea, live in hours." | Kills filler ("powered by AI, driven by obsession"), cuts 40%. "Hands on the keyboard" is cliché. |
| 22 | "Creator-led · AI-powered · Live in hours, not months" | "Creator-led · AI-built · Live in hours" | "Not months" is implied. "AI-powered" → "AI-built" is more concrete. |
| 23 | "Pitch Your Idea" (secondary CTA) | "Talk to Us" | "Pitch" implies formality; this goes to a contact form |
| 24 | "↓ See what we've built" | "↓ See our builds" | Tighter |

### Services

| # | Before | After | Why |
|---|--------|-------|-----|
| 25 | "What happens when you show up" (eyebrow) | "What we do" | The current one is trying too hard |
| 26 | "You talk. We build. You iterate." | "You talk. We build. You ship." | "Iterate" is jargon. "Ship" is the desired outcome. |
| 27 | "We Build It. Fast." | "We Build It" | "Fast" is redundant — speed is communicated everywhere |
| 28 | Service desc: "You describe it. We build it. Same conversation. Not a prototype — a live, deployed product with real people using it." | "Describe what you need. We build and deploy it — often before the end of the day." | Same meaning, 40% fewer words. "Real people using it" is aspirational padding. |
| 29 | "From Idea to Game Plan" | "From Idea to Plan" | "Game Plan" is sports cliché |
| 30 | "Ready to Launch, Day One" | "Launch-Ready from Day One" | Tighter structure |

### Differentiator

| # | Before | After | Why |
|---|--------|-------|-----|
| 31 | "Why this hits different." | "Why we're different." | "Hits different" is dated slang that undermines credibility |
| 32 | "Unbelievably fast" | "Unreasonably fast" | Same energy, slightly more intentional |
| 33 | "Real product thinking, not templates" | "Product thinking, not templates" | "Real" is a filler word per the clarify skill |

### Model

| 34 | "Built for alignment." → Already strong, keep |
| 35 | "Not a services menu — a real partnership." → "Not a services menu — a partnership." (kill "real") |

### Credibility

| 36 | "Builder, not vendor." → ✓ Keep |
| 37 | "VibeCo is led by a builder who has shipped products across multiple industries. This isn't a services play — it's a thinking partnership for people creating things that matter." → "Led by a builder who's shipped across industries. Not a services play — a thinking partnership for people building things that matter." | Kills filler "VibeCo is" (they know what site they're on), tightens. |

### FinalCta

| 38 | "Your idea could be live before dinner. Not a wireframe — a real product your first customers can use tonight." → "Your idea could be live by tonight. Not a wireframe — a product your first customers can use." | Kills "real" (filler). "Before dinner" → "by tonight" is clearer. |
| 39 | "Or Pitch It Directly →" → "Or Talk to Us →" | Consistent with hero secondary CTA rename |

### ContactForm

| 40 | "Submit →" → "Send Idea →" | Specific verb + object per clarify skill |
| 41 | "Sending..." → "Sending..." | ✓ Keep — it's contextual |
| 42 | "Something went wrong. Please try again." → "Couldn't send your idea. Check your connection and try again." | Specific per clarify patterns |

---

## Part 3: Iterative Improvement Roadmap

### Sprint 1: Copy & Messaging (This Session)
- [x] Apply all copy changes from Parts 1 & 2 above

### Sprint 2: P3 Polish Issues (Next)
Apply remaining critique findings:
- Improve toast messages to be more actionable (suggest next step)
- Add tooltips to Deep/Quick mode toggle
- Fix stale draft resume toast (only fire if draft is actually meaningful)

### Sprint 3: Onboard Skill — First-Visit Experience
- Add a one-sentence explainer below the simulator textarea: "You'll get 3 rounds of analysis. Questions are optional — skip ahead anytime."
- Add tooltips to highlight/flag icons explaining their impact
- Add "See a sample report" link on the simulator input page

### Sprint 4: Overdrive Skill — Section-by-Section Polish
Priority order (highest visual impact first):
1. SpeedTimeline — add scroll-driven animation triggers
2. EverydayFounders — add staggered card reveals with asymmetric timing
3. ProjectShowcase — add hover depth effects
4. ContactForm — add success state animation

### Sprint 5: Critique Skill — Post-Polish Audit
- Re-run Nielsen heuristic scoring on the full simulator flow
- Check for AI slop introduced by overdrive polish
- Score should target 32+/40 (up from 24/40)

### Sprint 6: Clarify Skill — Second Pass
- Re-audit all copy after structural UX changes from sprints 2-4
- Ensure terminology is consistent across new features
- Audit any new toasts, tooltips, or empty states

### Future Skills to Consider
From the Impeccable repo, these could be adapted next:
- **Accessibility** skill — WCAG AA audit, focus management, screen reader testing
- **Performance** skill — Core Web Vitals audit, lazy loading, bundle optimization
- **Density** skill — information density tuning for data-heavy views (My Simulations dashboard)

### Files Modified

| File | Changes |
|---|---|
| `src/components/simulator/IdeaInput.tsx` | Subhead, validation hint, Enter label |
| `src/components/simulator/SimulatorShell.tsx` | Analyzing phase time estimates |
| `src/components/simulator/FollowUpQuestions.tsx` | Header, subhead, CTA labels, depth hint |
| `src/components/simulator/IdeaBrief.tsx` | Email unlock copy (4 strings) |
| `src/components/HeroVariantA.tsx` | Body copy, sub-tagline, secondary CTA, builds link |
| `src/components/HeroVariantB.tsx` | Same copy changes as A |
| `src/components/HeroVariantC.tsx` | Same copy changes as C |
| `src/components/Services.tsx` | Eyebrow, heading, card titles/descriptions |
| `src/components/Differentiator.tsx` | Heading, card titles |
| `src/components/Model.tsx` | Partnership subtitle |
| `src/components/Credibility.tsx` | Body paragraph |
| `src/components/FinalCta.tsx` | Body copy, secondary CTA |
| `src/components/ContactForm.tsx` | Submit button, error toast |

No backend changes. No migrations.
