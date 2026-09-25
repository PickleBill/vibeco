# Brick sister-site handoff for Claude / Cowork

PROJECT: VibeCo (`vibeco-labs`) ↔ Brick (`vibe bill website`)
STATUS: VibeCo local implementation complete for review; not published. Brick remains Claude-owned.

Place a prominent link in Brick's project/working-lab area once Bill approves the VibeCo release:

**VibeCo — my working AI lab.**

“Explore how I research opportunities, test ideas, and turn commercial questions into working tools.”

Destination: https://vibeco.lovable.app/

Supporting navigation can deep-link to `/examples` for a reliable interview walkthrough. Keep Brick's résumé and experience narrative as its main job; VibeCo demonstrates a working process. Lead with Strategic Partnerships & Business Development while retaining enterprise sales and hands-on operating experience.

VibeCo now links back to https://picklebill.github.io/Brick/ from About Bill and the footer. No Brick files were changed in this run. NET-OS continues to own contacts, applications, and job-search tracking.

## Backend compatibility

Brick currently uses VibeCo's `ask-bill` Edge Function. That function, its agent, and all its existing transitive shared dependencies are unchanged in this checkout. New VibeCo guards wrap other functions without modifying this contract.

The existing GitHub workflow `deploy-ask-bill.yml` triggers on **any** `_shared` change pushed to main. Therefore even these additive changes can redeploy the unchanged ask-bill function when merged. Treat a main push as a release action; confirm secrets/environment and run a bounded real Brick terminal smoke test in the authorized release process.

No message was dispatched to Claude or Cowork; this is the reviewable handoff artifact.
