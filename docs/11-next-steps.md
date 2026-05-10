# Next Steps

Last reviewed on 2026-05-10.

This document turns the current repo state into the smallest practical implementation plan. It is intentionally biased toward hackathon demo completion, not architectural perfection.

## Delivery Position

The backend foundation is ahead of the product workflow.

Today the repo already has:

- auth and protected internal routes
- a strong Prisma schema
- source asset persistence and upload routes
- generation/regeneration request plumbing
- public review mutation APIs

What is still missing is the part that makes the product demoable:

- creating or selecting a real project/session
- ingesting sources from the UI
- generating and persisting a real brief snapshot
- rendering that snapshot internally
- sharing it publicly and letting the client review it from the UI

## Recommended Build Order

### 1. Close the internal happy path first

Goal: an internal user can open the app, select a seeded project/session, add source material, trigger generation, and see a result.

Required work:

- add a minimal project/session loader for the internal app
- replace empty sidebar state with seeded or queried project/session items
- wire the right pane source list to `GET /api/sessions/[sessionId]/assets`
- wire pasted-text submission to `POST /api/sessions/[sessionId]/assets`
- wire file upload controls to UploadThing routes
- surface asset status, filename, and delete/rename actions
- wire the generate button or composer action to `POST /api/generate`

Why first:

- this is the narrowest path to prove the product is more than a design shell
- it also gives the team a place to validate every later feature against real session data

### 2. Implement one real generation pipeline, not four partial ones

Goal: generation should succeed for at least one usable source path.

Recommended scope:

- support pasted text first
- optionally include PDF text extraction if it is quick and stable
- treat audio and image understanding as follow-up unless already near-complete

Required work:

- normalize collected source text into a single promptable bundle
- define the generation contract for claims, questions, confidence, and evidence refs
- call the model and validate the response
- persist `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef`
- update the processing job to `SUCCEEDED` on success
- record a `GENERATED` revision event

Why this order:

- the repo already accepts uploads for all source types, but the hackathon will be won or lost on one reliable end-to-end flow
- a text-first path is much easier to demo cleanly than incomplete multimodal support

### 3. Bind the internal brief view to persisted snapshot data

Goal: the internal workspace shows a real brief instead of mock requirements.

Required work:

- fetch the latest snapshot for the active session
- map claims into summary and goals sections
- map questions into ambiguities and follow-up sections
- render confidence levels and source citations
- show empty/loading/error states around generation jobs
- connect the revisions tab to persisted revision events

Definition of done:

- a user can tell which snapshot they are looking at
- each displayed claim or question can point back to evidence
- the UI clearly distinguishes “no snapshot yet” from “generation running” from “generation failed”

### 4. Make the public share flow real

Goal: a generated snapshot can be shared and reviewed through the actual public page.

Required work:

- implement share-link creation for a snapshot
- load snapshot data on `/brief/[shareToken]`
- replace mock client brief content with persisted claims/questions
- wire comment submission to the comment API
- wire answer submission to the answer API
- wire confirm action to the confirm API
- surface client-visible success and failure states

Why now:

- the mutation backend is already mostly there
- the missing part is the page data model and the UI wiring

### 5. Add the revision loop that matters for the demo

Goal: client feedback changes what the internal team sees and can regenerate from.

Required work:

- show comments and answers in the internal workspace
- expose a “regenerate from current snapshot” action
- attach feedback context when building the regeneration input
- persist a new snapshot version
- show revision history in the UI

Keep it narrow:

- do not build full diff tooling unless time remains
- do not build freeform internal editing before the regenerate loop works

### 6. Harden the demo path

Goal: the implemented flow survives a live demo.

Required work:

- add component tests for the public review form behavior
- add one internal happy-path e2e
- add one public review happy-path e2e
- add one accessibility smoke test for the public brief page
- verify production env vars for Clerk, UploadThing, database, Inngest, and model access
- rehearse a seeded demo with realistic source material
- prepare a fallback demo dataset and recovery script

## Recommended Definition Of MVP

If time gets tight, treat this as the locked MVP:

1. Internal user opens a seeded project/session.
2. Internal user pastes text or uploads a PDF.
3. Generation succeeds and creates a persisted brief snapshot.
4. Internal user reviews the brief with evidence-backed sections.
5. Internal user creates a public share link.
6. Client opens the link, leaves one comment, answers one follow-up, and confirms.
7. Internal user sees the feedback and regenerates a new version.

Everything else is secondary until this works.

## De-Scope Guidance

If the team needs to cut scope, cut in this order:

- mixed-source polishing before text-first generation
- audio transcription before public review UX
- image interpretation before revision history polish
- access-code gating before share-link creation
- animation and novelty treatment before e2e and demo rehearsal

Do not cut:

- snapshot persistence
- public review data flow
- revision event persistence
- one reliable end-to-end demo scenario

## Immediate Task List

These are the next concrete tasks I would assign now:

1. Wire the internal app to a real seeded project/session and session assets.
2. Add a real “Generate brief” trigger in the workspace UI.
3. Implement text-first snapshot generation and persistence in the Inngest function.
4. Replace mock internal brief content with snapshot-backed rendering.
5. Add share-link creation and snapshot loading on the public brief route.
6. Connect public comment, answer, and confirm actions from the client page.
7. Add one internal and one public end-to-end test around the seeded demo flow.
