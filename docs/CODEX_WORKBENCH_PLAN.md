# VibeCo: a powerful workbench people can understand

## 1. Product direction

**Keep VibeCo’s breadth. Make its value easier to discover, use, and trust.**

Your clarification is central: company research is one application of VibeCo, alongside business ideas, initiatives, app concepts, and difficult decisions. The product should retain its general-purpose nature.

The relationship between your two sites should be clear:

| Surface | Its job |
|---|---|
| **Brick** | Establish your experience, commercial credibility, and career story. |
| **VibeCo** | Let people experience how you explore problems, challenge assumptions, and turn thinking into useful work. |
| **Your saved VibeCo workspace** | Support your research and preparation using the same tools available to visitors. |

Your positioning remains Strategic Partnerships & Business Development, with enterprise sales, operating experience, and hands-on building reinforcing that story.

Suggested product promise:

> **Turn a messy question into a clear next move.**  
> Explore an idea, research a company, pressure-test an initiative, or work through a decision.

The strongest interview impression would be: **“Bill understands the business problem, asks useful questions, and can make something work.”**

## 2. What the review established

I reviewed the live entry points at desktop and mobile sizes, current GitHub source, Brick’s integration, and the earlier unfinished local redesign. **Live AI generation, authenticated saving, exports, and deployed database permissions still require end-to-end validation.** Nothing was changed or published.

**There is substantial functionality worth preserving:** structured briefs, multiple perspectives, expansion and distillation, synthesis, debate, prompt grading/refinement, saved insights, reports, exports, and a real signal-collection pipeline. [Current repository](https://github.com/PickleBill/vibeco)

The most consequential findings:

| Priority | Finding | Revamp implication |
|---|---|---|
| **P1** | The homepage sells rapid app-building services; the simulator asks “What are you building?” | Broaden the entry language and show useful outcomes immediately. |
| **P1** | In a fresh session, `/auth` redirected home. Automatic guest sessions conflict with sign-in handling. | Repair guest-to-account conversion before relying on saved research. |
| **P1** | Source code exposes weaknesses in report-sharing and internal-data permissions. Deployment enforcement remains unverified. | Make research private by default; require explicit, revocable sharing and verified ownership checks. |
| **P1** | Generated perspectives and market claims can resemble researched evidence. Signal results lack clickable supporting sources. | Distinguish sourced facts, assumptions, synthetic perspectives, and recommendations. |
| **P1** | Some save and Signal actions can announce success without confirming persistence. | Make success, failure, and recovery truthful. |
| **P2** | Navigation mixes public tools, internal Hub, portfolio administration, and saved work. Cross-page “Builds” navigation fails to scroll correctly. | Separate public navigation from account tools and repair route behavior. |

The sharing concern is supported by the [report-sharing function](https://github.com/PickleBill/vibeco/blob/512586c2a45ea7688ca0eaf0f5e75265e2da7836/supabase/migrations/20260623220702_375f4040-ea2b-4c17-bdd4-aaa482637bf9.sql#L60-L88) and [public event policy](https://github.com/PickleBill/vibeco/blob/512586c2a45ea7688ca0eaf0f5e75265e2da7836/supabase/migrations/20260623213946_c65dfb9c-dd6b-4f7c-876b-3f7e15ccf0d5.sql#L1-L20). These are source findings, not evidence that private records were accessed.

**Design assessment:** the cream-and-teal identity has character. The generic AI imagery, repeated project cards, long marketing sequence, and public A/B controls weaken it. Preserve the expressive personality and replace decorative demonstrations of “AI” with demonstrations of the actual product.

Provisional usability assessment of inspected screens and source—not a functional certification:

| Heuristic | Score / 4 | Main concern |
|---|---:|---|
| System status | 2 | Ambiguous saved/sample/result states |
| Familiar language | 2 | Building terminology narrows the product |
| User control | 2 | Sign-in and navigation friction |
| Consistency | 2 | Public and internal experiences overlap |
| Error prevention | 2 | Saving and sharing safeguards need proof |
| Recognition | 2 | Several destinations need explanation |
| Efficiency | 3 | Strong refinement and deeper-analysis tools |
| Minimalism | 1 | Long homepage and competing choices |
| Error recovery | 1 | Some failures can appear successful |
| Help | 2 | Examples need broader, clearer guidance |
| **Total** | **19/40** | **Strong capabilities; substantial usability work** |

The homepage fails four cognitive-load checks: single focus, manageable grouping, minimal choices, and progressive disclosure. An interviewer encounters a services pitch; a newcomer encounters internal terminology; you encounter uncertainty about saving and provenance.

## 3. The experience to build

### A simpler entrance

Use three primary destinations: **Workbench · Examples · About Bill**. Put saved work and account settings in the account area.

The homepage should contain:

1. The product promise and a prominent question box.
2. Four optional starting points: **Idea or app · Company or topic · Business initiative · Decision or disagreement**.
3. A worked example that reveals the resulting report before asking someone to invest time.
4. Three selected work stories, followed by access to the broader catalog.

Examples should populate the input without automatically starting a paid run. Remove public experiment controls. Replace unsupported testimonials and delivery claims with verified work and clearly labeled project maturity.

### One shared journey, with appropriate outputs

**Frame → Explore → Challenge → Decide → Put it to work**

Show a useful summary first: the question, recommendation, main tradeoffs, uncertainties, and next actions. Let users open the depth:

| Existing capability | Its place in the experience |
|---|---|
| Personas and debate | **Explore perspectives / Challenge this** |
| Expand and distill | **Explore alternatives / Find the essential point** |
| Highlights, flags, saved insights | **Keep this / Question this / Save insight** |
| Prompt grading and refinement | **Improve the instructions for the next step** |
| Build specifications and visual concepts | Available when the task involves building |
| Reports, PDF, copy, sharing | A consistent output area |
| Signal Scanner | A research tool inside the workbench |
| Portfolio management and internal Hub | Appropriate account and owner areas |

**Changing labels alone will not achieve this.** The current report structure and refinement prompts assume an app, customers, features, and revenue. However, an existing general-purpose debate agent already supports broader topics and custom perspectives. Reuse that capability while preserving the original build workflow. [Existing debate contract](https://github.com/PickleBill/vibeco/blob/512586c2a45ea7688ca0eaf0f5e75265e2da7836/supabase/functions/_shared/agents/debate.ts#L127-L156)

For company research, add source collection and citations. For disagreements, distinguish supplied facts from interpretations of others’ motives. Agreement among AI personas must not be presented as factual confidence.

### An expressive working studio

Retain warm surfaces, distinctive typography, color, and purposeful motion. Give long reports excellent readability and clear section navigation.

Make the signature visual the transformation of an ambiguous question into structured thinking. Keep the full analytical workbench public, with a limited guest run and account creation for saving and continued use. Include a reliable, clearly labeled worked example for interview conditions.

## 4. Implementation, project ownership, and compatibility

**This belongs in a dedicated VibeCo project**, connected to `PickleBill/vibeco`, using the existing registry identity `vibeco-labs`. The existing **“vibe bill website”** project is Brick and should remain Claude’s workspace.

Recommended responsibilities:

- **Codex:** VibeCo implementation and validation in an isolated checkout.
- **Claude:** Brick redesign and its sister-site placement.
- **Lovable:** Optional UI exploration and the existing publishing surface; verify the active project/branch before editing there.
- **GitHub:** Reviewed source and version history.
- **Cowork:** Cross-project coordination and canonical status.

No callable Lovable connector was available in this review. Its active editing branch remains a verification item.

Execute in this order:

1. **Establish a trustworthy baseline.** Inventory capabilities; reconcile the unfinished local redesign; fix authentication, ownership, sharing, save errors, and misleading result states.
2. **Deliver one complete vertical slice.** New entrance → existing build analysis → readable report → refinement → save/reopen → export. Preserve the engine’s depth.
3. **Extend the shared flow.** Add purpose-aware reports using the existing debate capability, neutral context briefs, appropriate output prompts, and cited research.
4. **Complete the showcase and Brick connection.** Add selected evidence stories, the full catalog, reciprocal links, and final responsive/accessibility polish.

Important interface requirements:

- Add report purpose/version without overwriting historical report structures. Unversioned reports remain legacy build reports; preserve their viewing, refinement, forks, exports, and links.
- Preserve source references through research and synthesis.
- Enforce guest/account allowances on the server across AI tools; add request limits and duplicate-run protection.
- Preserve `/simulate` and existing incoming anchors through compatible routes or redirects.
- Protect Brick’s **`ask-bill`** backend interface: Brick currently calls a function hosted with VibeCo. Shared backend changes require regression checks. [Brick dependency](https://github.com/PickleBill/Brick/blob/main/home.js#L315-L322)

Suggested Brick link: **“VibeCo — my working AI lab.”**  
Supporting copy: “Explore how I research opportunities, test ideas, and turn commercial questions into working tools.”

VibeCo stores its analyses; NET-OS retains ownership of contacts, applications, and job-search tracking.

## 5. Acceptance criteria and refined brief

The revamp is ready for review when:

- A newcomer understands the product and starts without explanation.
- A three-minute interview walkthrough demonstrates a question, competing perspectives, a judgment, and a useful output.
- An app idea, company-research question, initiative, and disagreement each receive an appropriate report.
- Existing build reports retain their features and survive view, resume, refine, export, and sharing tests.
- Guest work survives account creation; failed saves never display success.
- A second account cannot access private work; sharing and revocation behave correctly.
- Research claims link to evidence; synthetic perspectives and paraphrases are labeled.
- Timeouts, partial results, empty scans, usage limits, mobile navigation, keyboard access, and reduced motion are tested.
- Brick links and `ask-bill` still work.

**Defaults chosen:** retain the VibeCo name and existing stack; evolve incrementally; preserve general-purpose functionality; use an expressive studio aesthetic with readable reports; allow a limited guest trial; publish only after Bill’s approval.

**Copy-ready refined brief**

> **PROJECT:** VibeCo / `vibeco-labs` / `PickleBill/vibeco`  
> **TRIPWIRE:** Preserve functional breadth, private data boundaries, historical reports, and Brick compatibility.  
> **ROLE:** Product partner, builder, and validator.  
> **WRITABLE HOME:** An isolated checkout of the verified VibeCo repository.  
> **PRECONDITIONS:** Confirm the Lovable project and active branch, inspect prior local changes, and establish the existing capability baseline.
>
> Revamp VibeCo into an expressive, understandable general-purpose AI workbench and a credible sister asset to Bill Bricker’s résumé site. Preserve its simulation, perspectives, debate, synthesis, prompt refinement, research, saving, and export capabilities. Support ideas, company research, initiatives, and decisions through one coherent experience with appropriate outputs.
>
> Lead with useful results, reveal advanced tools progressively, substantiate public claims, and distinguish evidence from generated analysis. Support a limited guest trial and private account workspaces. Coordinate Brick links and its shared backend dependency with Claude.
>
> **OUTPUT:** Reviewable preview, capability-preservation map, concise change report, and evidence from functional and compatibility tests.  
> **DONE WHEN:** The acceptance criteria above pass and the result demonstrates Bill’s commercial judgment through a product people can actually use.

**Prompt assessment: 9/10.** Intent, audience, scope, and ownership are settled. Remaining uncertainty concerns deployed behavior and Lovable configuration, which the baseline phase must verify.

