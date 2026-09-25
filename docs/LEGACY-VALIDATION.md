# Legacy build workflow: preservation and verification

The original build report schema and three-round simulation remain intact. General-purpose reports use schema version 2 separately. Old reports with a brief but no rounds can reopen; completed reports need not have a generated prompt to reopen as a report.

## Behavior preserved and repaired

- Initial analysis, follow-up answers, final briefs, highlights/flags, feature order, repeat refinement, prompt versions, and saved-report resume remain available.
- Refinement and persistence receive the same explicit round snapshot. Newly answered questions and edited briefs no longer disappear through stale React state. Late canceled responses cannot replace the current screen.
- Concept illustrations and logos remain available as explicit actions, with partial failures reported and generated visuals accessible in the report.
- Expand, distill, persona analysis, cross-agent synthesis, prompt grading/refinement, alternate handoff prompts, and saved insights remain available. Grading is now an explicit action, and examples never invoke these tools automatically.
- Prompt copy and structured PDF export no longer require email capture. Public sharing requires an explicit owner action through the sharing RPC, and revocation is available.
- Build reports and exported PDFs identify synthetic perspectives and unsupported market claims. The synthesis panel no longer presents AI agreement as numerical factual confidence or an invented dollar amount spent.
- Saved-insight mutations wait for a database response. Failed mutations retain the current item; local insights migrate into the same report when it gains an ID. Drafts are scoped by session, and worked examples do not modify real insight storage.
- Prepared build examples lead with the report rather than progress controls. They permit reading, copying, and PDF export; model tools and sharing are unavailable until the user starts their own question.

## Automated verification

`src/test/build-flow.test.tsx` runs the real Shell with mocked model/persistence boundaries: three-round history, current answers, resume, edited-brief refinement, save failure, prefilled/example isolation, and late cancellation.

`src/test/final-report.test.tsx` runs the report UI: explicit grading, copying without email, sharing and revocation, ownership failure, accessible example heading, disabled example tools, and real jsPDF output with a `%PDF-` header, the build prompt, and an evidence-boundary statement.

`src/test/insight-storage.test.tsx` covers isolated sample storage, local-to-report migration, failed migration preservation, and rejected pin/remove mutations.

These checks use deterministic mocked provider/database responses. They do not demonstrate deployed Supabase behavior, real provider accuracy, or production performance. Live account conversion, sharing/RLS, and provider checks remain staging requirements. Existing legacy TypeScript `any` usages and hook-dependency lint warnings are separate from functional verification; do not report the full historical repository lint as clean.
