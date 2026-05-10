# Current State

Last reviewed against the repository on 2026-05-10.

This file tracks what is actually present in code today. A UI shell or mock screen does not count as a completed feature unless it is wired to persisted data and working end to end.

## Summary

The repo is beyond planning-only status.

What is genuinely implemented today:

- core `Next.js` app scaffold, styling, auth wiring, Prisma schema, initial migration, and seed path
- internal auth protection with Clerk for `/app` and internal mutation routes
- source asset persistence for pasted text and uploaded files
- UploadThing routes for image, audio, PDF, and mixed uploads
- asset listing, rename, and delete APIs for intake sessions
- generation and regeneration request APIs that create processing jobs and dispatch Inngest events
- public review mutation backend for comments, follow-up answers, and confirmation
- unit tests around validators, asset services, public review services, public review routes, and public rate limiting

What is still mostly scaffolded or mock-only:

- internal workspace UI
- public brief UI
- brief generation pipeline
- project/session management flows
- any rendering of real generated snapshots

## Foundation

- [x] Next.js app scaffolded
- [x] Tailwind configured
- [x] Environment variable strategy documented
- [x] Shared repo structure created
- [x] Core scripts added
- [x] Vercel config file present

## Auth and Access

- [x] Clerk integrated
- [x] Internal app routes protected
- [x] Public brief route left open
- [x] Internal API authorization helpers added
- [x] Public mutation rate limiting added
- [x] Public mutation validation and error mapping added
- [ ] Optional public access-code gate implemented

## Data and Persistence

- [x] Prisma schema created
- [x] Initial migration created
- [x] Demo seed flow created
- [x] Core models for projects, sessions, assets, chunks, snapshots, comments, answers, share links, revision events, and jobs created
- [x] PostgreSQL-compatible datasource configured
- [ ] Supabase-specific deployment connection verified
- [x] UploadThing storage integration connected
- [x] Source chunk model created
- [x] Processing job model created

## Projects and Sessions

- [ ] Project creation flow implemented
- [ ] Intake session creation flow implemented
- [ ] Project/session query layer implemented
- [ ] One-client-per-project rule enforced in app logic
- [ ] Project/session sidebar history wired to persisted data

Notes:

- the schema supports projects and intake sessions
- the internal sidebar is currently an empty-state UI, not a real navigator

## Source Intake

- [x] Raw text intake API implemented
- [x] Image upload route implemented
- [x] Audio upload route implemented
- [x] PDF upload route implemented
- [x] Mixed-source upload route implemented
- [x] Upload validation implemented
- [x] Session asset listing API implemented
- [x] Asset rename API implemented
- [x] Asset delete API implemented
- [ ] Intake UI wired to these APIs
- [ ] Upload progress states implemented
- [ ] Batch submission flow surfaced in the UI

## AI Generation

- [x] Generation request API implemented
- [x] Regeneration request API implemented
- [x] Processing jobs persisted when generation is requested
- [x] Inngest generation triggers wired
- [ ] Text normalization pipeline implemented
- [ ] Audio transcription implemented
- [ ] PDF extraction implemented
- [ ] Image interpretation implemented
- [ ] Vertex AI generation path implemented
- [ ] Brief contract validation implemented
- [ ] Snapshot persistence implemented
- [ ] Successful job completion path implemented
- [ ] Generation progress surfaced in UI

Notes:

- current Inngest functions deliberately mark jobs as failed with `PIPELINE_NOT_IMPLEMENTED`

## Brief Rendering

- [ ] Internal brief renderer backed by snapshot data implemented
- [ ] Public brief renderer backed by snapshot data implemented
- [ ] Summary claims rendering implemented
- [ ] Goals claims rendering implemented
- [ ] Ambiguities rendering implemented
- [ ] Follow-up questions rendering implemented
- [ ] Confidence labels rendered from stored data
- [ ] Claim-level citations rendered from stored data
- [ ] Evidence detail panel implemented against real evidence refs

Notes:

- both the internal document view and the public brief page are currently design shells with mock content

## Internal Workspace

- [x] Desktop workspace shell implemented
- [x] Left sidebar shell implemented
- [x] Main document pane shell implemented
- [x] Bottom chat/composer shell implemented
- [x] Right-side inspector shell implemented
- [x] Command palette shell implemented
- [ ] Workspace wired to real projects, sessions, assets, snapshots, or jobs
- [ ] Source assets panel implemented with real data
- [ ] Revision timeline implemented with real data
- [ ] Chat history implemented with real data
- [ ] Responsive internal fallback behavior verified

## Public Review

- [x] Public review comment API implemented
- [x] Public follow-up answer API implemented
- [x] Public brief confirmation API implemented
- [x] Public review service persists revision events
- [ ] Public share-link creation flow implemented
- [ ] Public brief page wired to persisted snapshot data
- [ ] Inline comment UI wired to comment API
- [ ] Follow-up answer UI wired to answer API
- [ ] Brief confirmation UI wired to confirm API
- [ ] Public success and error states implemented in UI
- [ ] Mobile public review support verified

Notes:

- backend support for public review mutations is further ahead than the public page UI

## Revision and Feedback

- [x] Public feedback events persisted
- [x] Public confirmation events persisted
- [x] Regeneration can be requested from an existing snapshot ID
- [ ] Selected-section refinement implemented
- [ ] Regenerate-from-feedback pipeline implemented end to end
- [ ] Revision diff review implemented
- [ ] Snapshot restore action implemented
- [ ] Feedback surfaced in internal workspace

## Testing

- [x] Vitest configured
- [ ] React Testing Library configured
- [ ] jest-dom configured
- [ ] Playwright configured
- [ ] axe or equivalent accessibility checks configured
- [ ] Brief contract validation unit tests added
- [ ] Evidence mapping unit tests added
- [x] Asset service unit tests added
- [x] Public auth unit tests added
- [x] Public review validator unit tests added
- [x] Public review service unit tests added
- [x] Public review route tests added
- [ ] Workspace component tests added
- [ ] Public feedback component tests added
- [ ] Desktop e2e happy path added
- [ ] Mobile public review e2e happy path added
- [ ] Accessibility smoke tests added

## Deployment and Demo

- [x] Demo seed data prepared
- [ ] Production database connection verified
- [ ] UploadThing production config verified
- [ ] Clerk production config verified
- [ ] Inngest production config verified
- [ ] Vertex AI secrets/config verified
- [ ] Demo happy path rehearsed
- [ ] Backup demo plan prepared
