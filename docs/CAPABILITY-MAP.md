# VibeCo capability preservation map

Status: implemented locally on `codex/vibeco-workbench`; production unchanged.

| Capability | Current home / behavior | Preservation and proof |
| --- | --- | --- |
| Four starting purposes | Homepage and `/simulate` | Build, research, initiative, decision; typed question survives switching; browser checks at desktop/mobile |
| Original build questions and briefs | Idea or app | Original report structure and features retained; current answers and edited briefs drive subsequent calls; resume-round tests |
| Perspectives, expansion, distillation, synthesis | Build report advanced controls | Existing engine retained; explicit on-demand requests; prepared report cannot launch live calls |
| General-purpose debate | Company/topic, initiative, decision | Existing debate agent reused with purpose-specific lenses; runtime-validated schema version 2; no mandatory customers/features/revenue schema |
| Source collection | General reports and Signal Scanner | Bounded public sources; system-owned URLs/IDs/dates; unsupported citations rejected; source failures disclosed; Signal handoff carries source URLs |
| Evidence and uncertainty | Report evidence section | Source facts, supplied context, assumptions, synthetic perspectives, limits, and next actions remain distinct |
| Challenge / refinement | General report input and legacy refine controls | Prior report retained if run fails; relevant source URLs survive refinement; no automatic paid grading |
| Prompt tools | Legacy report Action Hub; general next-step prompt | Existing grading, refinement, alternative prompt tools retained; general prompt suits purpose |
| Concept images / logos | Optional build visual action | Explicit request only; no automatic images for research or examples |
| Highlights / anti-highlights | Legacy build reports | Retained in report storage; existing saved insights hook verifies mutation results |
| Saved insights | Legacy Vibe Stack; general session keeps | Legacy local insights migrate when report gains an ID; general “Keep” is clearly session-only and can be copied or included in refinement |
| Private reports | Account → Saved work | Owner filtering and database RLS; schema 1 historical reports remain intact; schema 2 stored separately; save success requires returned row |
| Resume / fork | Saved work | Existing build reports supported; general save updates URL for refresh/reopen; fork begins with question |
| Export | Report toolbar | Build PDF and prompt copy retained; general PDF, Markdown and copy preserve evidence/uncertainty; actual downloaded files checked |
| Sharing | Explicit owner control | Private by default, registered owner can enable/revoke; shared route returns curated report; old shared URLs require enabling sharing again |
| Guest continuation | Account conversion | Email/OAuth upgrade preserves UID and drafts; separate-account login requires recovery archive and clears browser work after success |
| Signal Scanner | Workbench research link → `/signal` | Public collection/classification/clustering remains; transient scans do not claim persistence; empty/error/partial results distinguished; sources clickable |
| Owner research history / admin | Portfolio / Hub | Account role controls navigation and pages; SQL controls internal records; historical ownerless data is not deleted |
| Catalog / selected stories | Home → Builds | All 14 catalog links preserved; three featured stories; prototype maturity disclosed; no unsupported performance claims |
| Brick connection | About Bill, footer, handoff document | Reciprocal VibeCo links present; Brick itself untouched; `ask-bill` transitive source dependencies unchanged |
| Incoming routes and anchors | `/simulate`, `/#model`, `/#projects`, `/#contact` | Compatible destinations retained; cross-page scroll waits for lazy content |

## Deliberate changes to the default experience

Public experiment controls, the extended service-sales pitch, unsupported testimonials and delivery claims are removed from the homepage. Internal tools remain available to authorized owners. Build detail remains in its existing workflow, while non-build reports use a new additive schema.

Prepared examples demonstrate structure and judgment without pretending to be fresh research or calling paid services. The local preview blocks Supabase transport altogether. It therefore validates interface behavior and offline contracts, not provider quality or deployed account behavior.

## Historical data contract

The migration adds `purpose`, `schema_version`, `general_report`, and `sharing_enabled`. Existing rows default to build/schema 1; old brief/round/image/prompt fields are not rewritten. Ownerless legacy records are retained but not assigned to an account by guesswork. Private-by-default intentionally changes formerly implicit shared reads: owners must explicitly enable a link.
