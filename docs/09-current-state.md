# Current State

Use this file as the simplest possible implementation tracker. Check items only when the feature is actually working, not when it is partially scaffolded.

## Foundation

- [x] Next.js app scaffolded
- [x] Tailwind configured
- [x] Environment variable strategy documented
- [x] Shared repo structure created
- [x] Core scripts added

## Auth and Access

- [x] Clerk integrated
- [x] Internal routes protected
- [x] Public brief route left open
- [x] Internal API authorization helpers added
- [ ] Public mutation boundaries implemented

## Data and Persistence

- [x] Prisma schema created
- [x] Initial migration created
- [x] Demo seed flow created
- [ ] Supabase Postgres connected
- [x] UploadThing storage integration connected
- [x] Source chunk model created
- [x] Processing job model created

## Projects and Sessions

- [ ] Project creation implemented
- [ ] One-client-per-project rule enforced
- [ ] Intake session creation implemented
- [ ] Project/session sidebar history implemented

## Source Intake

- [x] Raw text intake implemented
- [x] Image upload implemented
- [x] Audio upload implemented
- [x] PDF upload implemented
- [x] Mixed-source folder upload implemented
- [ ] Mixed-source submission implemented
- [x] Upload validation implemented
- [ ] Upload progress states implemented

## AI Generation

- [ ] Inngest generation job wired
- [ ] Text normalization implemented
- [ ] Audio transcription path implemented
- [ ] PDF extraction path implemented
- [ ] Image interpretation path implemented
- [ ] Vertex AI generation path implemented
- [ ] Brief contract validation implemented
- [ ] Snapshot persistence implemented
- [ ] Generation progress surfaced in UI

## Brief Rendering

- [ ] Internal brief renderer implemented
- [ ] Summary section rendering implemented
- [ ] Goals section rendering implemented
- [ ] Ambiguities section rendering implemented
- [ ] Follow-up questions section rendering implemented
- [ ] Confidence labels rendered
- [ ] Claim-level citations rendered
- [ ] Evidence detail panel implemented

## Internal Workspace

- [x] Desktop workspace shell implemented
- [ ] Left rail project/session navigation implemented
- [ ] Bottom refinement composer implemented
- [ ] Right-side inspector implemented
- [ ] Source assets panel implemented
- [ ] Revision timeline implemented
- [ ] Chat history panel implemented
- [ ] Responsive internal fallback behavior implemented

## Public Review

- [ ] Public share link generation implemented
- [ ] Optional access-code gate implemented
- [ ] Public brief page implemented
- [ ] Inline highlighted comments implemented
- [ ] Follow-up answer submission implemented
- [ ] Brief confirmation implemented
- [ ] Public success and error states implemented
- [ ] Mobile public review support verified

## Revision and Feedback

- [ ] Selected-section refinement implemented
- [ ] Regenerate-from-feedback flow implemented
- [ ] Revision events persisted
- [ ] Revision diff review implemented
- [ ] Snapshot restore action implemented
- [ ] Feedback visible in internal workspace

## Novelty and UX Polish

- [ ] Optional landing-page decorative treatment added
- [ ] Controlled animejs transitions added
- [ ] Reduced-motion handling implemented
- [ ] Web haptics integrated for supported mobile events
- [ ] Haptics toggle implemented
- [ ] Workspace performance pass completed

## Testing

- [x] Vitest configured
- [ ] React Testing Library configured
- [ ] jest-dom configured
- [ ] Playwright configured
- [ ] axe-core checks configured
- [ ] Contract validation unit tests added
- [ ] Evidence mapping unit tests added
- [x] Service logic unit tests added
- [ ] Brief renderer component tests added
- [ ] Public feedback component tests added
- [ ] Desktop e2e happy path added
- [ ] Mobile public review e2e happy path added
- [ ] Accessibility smoke tests added

## Deployment and Demo

- [ ] Vercel deployment configured
- [ ] Environment variables configured in deployment
- [x] Demo seed data prepared
- [ ] Demo happy path rehearsed
- [ ] Backup demo plan prepared
