

## Plan: Increase Text Readability, Add "Everyday Founders" Section, and Lovable Projects Showcase

### 1. Increase text sizes across all components

The current body text uses `text-xs` (12px) almost everywhere, which is too small. The plan:

- **Body/description text**: Bump from `text-xs` to `text-sm` (14px)
- **Sub-labels** (like "Thesis", "What was built"): Bump from `text-[10px]` to `text-xs` (12px)
- **Section subtitles/muted text**: From `text-xs` to `text-sm`
- **Hero subheadline**: From `text-sm` to `text-base` (16px)
- **Card titles**: From `text-lg` to `text-xl` where appropriate
- **Navbar links**: From `text-xs` to `text-sm`

**Files affected**: Hero, Thesis, Services, Model, Fit, Builds, Differentiator, Credibility, ContactForm, FinalCta, Footer, Navbar

### 2. Add "Everyday Founders" section

A new component (`EverydayFounders.tsx`) positioned after the current Fit section, targeting non-technical/non-startup personas (real estate agents, lawn care operators, service businesses, etc.).

**Tone**: Welcoming and accessible — "You don't need to be a tech founder. You just need a real idea and the drive to test it."

**Content**:
- Headline: "Not a tech founder? Even better."
- Subtext explaining that the best ideas often come from people deep in an industry who see broken workflows every day
- 3-4 example persona cards: e.g. "Real estate agent who wants a client matching tool", "Lawn care operator who needs automated scheduling", "Fitness coach building a personalized training app", "Consultant turning expertise into a SaaS product"
- Emphasis on: we handle the tech, you bring the domain knowledge; we explore what's possible and move fast
- CTA linking to the contact form

**Navigation**: Add a "For Founders" or "Who It's For" nav link

### 3. Lovable Projects showcase section

A new component (`ProjectShowcase.tsx`) that displays your shipped Lovable projects as a scrollable gallery or grid.

Once you share your Lovable profile link, I'll pull the project names, descriptions, and URLs. For now the plan is:

- Section headline: "Shipped fast. Built to last." or "Recent Builds"
- Grid/carousel of project cards, each showing: project name, short description, and a link to the live preview
- Positioned after the existing Builds section (or replaces it, your call)
- Nav link added: "Portfolio" or "Projects"

### 4. Update Index.tsx and Navbar

- Import and add the two new sections to the page
- Add corresponding nav links

---

**Waiting on**: Your Lovable profile link to populate the projects showcase with real data. I can implement everything else immediately and use placeholders for the project list until then.

