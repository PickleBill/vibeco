

## Plan: Project Showcase with Thumbnails, Page Reorder, Nav Cleanup & Simulator UX Polish

### 1. Update Project Data with Thumbnails

Update `ProjectShowcase.tsx` with the full list of 11 live projects. Since we can't dynamically screenshot external sites at runtime, we'll use **OG image meta tags** via each project's URL as thumbnail sources, loaded as `<img>` tags pointing to a screenshot service (e.g., `https://image.thum.io/get/width/600/${url}` or similar free service). Alternatively, we store static screenshots in `/public/builds/` — but the fastest approach is using an external thumbnail API.

Updated project list:
- VibeCo (vibeco.lovable.app)
- NauticSim (naughtydata.lovable.app)
- FactFudge (factfudge.lovable.app)
- Moore Life (mooremental.lovable.app)
- HeadsUp Time (headsuptime.lovable.app)
- RAUM / Unicorse (unicorse.lovable.app)
- The Load (theload.lovable.app)
- Green Paws (greenpaws.lovable.app)
- Raleigh Crafting (raleighcrafting.lovable.app)
- Courtana (courtanacoach.lovable.app)
- Audition (audition.lovable.app)

Each card gets a thumbnail image at the top (using `thum.io` or `microlink.io` screenshot API), category badge, name, one-liner, and "View live" link on hover.

### 2. Move ProjectShowcase Higher on Homepage

Reorder `Index.tsx` sections:
```
Hero → EverydayFounders → ProjectShowcase → SpeedTimeline → Model → Fit → ContactForm → FinalCta
```
ProjectShowcase moves to "second fold" — right after EverydayFounders, before the SpeedTimeline.

### 3. Navbar: Simulator Front-and-Center, Remove "Pitch Your Idea"

- Remove the "Pitch Your Idea" solid button from the navbar entirely
- The glowing "Simulator" pill becomes the primary CTA (already prominent, just needs to be the only action button)
- Keep the subtle nav links (How It Works, Builds, Contact) and auth
- Update the `navLinks` array: change `#builds` to `#projects` to match the section ID
- Mobile menu: same treatment — remove "Pitch Your Idea", keep Simulator as primary

### 4. CTAs Throughout Page: Simulator-First

- **EverydayFounders**: Swap button prominence — "Try the Simulator" becomes primary (solid), "Tell Us Your Idea" becomes secondary (outline)
- **FinalCta**: Same swap — Simulator is the primary solid button, "Pitch Your Idea" becomes the secondary outline
- **Hero**: Already has "Simulate Your Idea" as primary — keep as-is

### 5. Simulator UX Polish (Minor)

- **IdeaInput**: Tighten header text slightly, make CTA more prominent
- **FollowUpQuestions**: Reduce text density — shorter intro, make question cards more scannable with larger option buttons and clearer "Submit" CTA
- **IdeaBrief**: Slightly reduce paragraph density, ensure email unlock banner is visually prominent
- **SimulatorShell**: Make the round indicator slightly larger and add a subtle label like "Round 1 of 3" text

These are minor CSS/copy tweaks — no structural changes to the flow.

### Files Modified

| File | Change |
|---|---|
| `src/components/ProjectShowcase.tsx` | Add 11 projects with thumbnail images, updated layout with image cards |
| `src/pages/Index.tsx` | Reorder: ProjectShowcase after EverydayFounders |
| `src/components/Navbar.tsx` | Remove "Pitch Your Idea" button, update `#builds` → `#projects` |
| `src/components/EverydayFounders.tsx` | Swap CTA prominence (Simulator = primary) |
| `src/components/FinalCta.tsx` | Swap CTA prominence (Simulator = primary) |
| `src/components/simulator/FollowUpQuestions.tsx` | Reduce text density, larger option buttons |
| `src/components/simulator/IdeaInput.tsx` | Minor copy/spacing tweaks |
| `src/components/simulator/SimulatorShell.tsx` | Slightly larger round indicator |

