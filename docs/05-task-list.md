# Task List

## Done

### Auth & Workspace
- [x] Clerk auth routes and middleware
- [x] Custom sign-in, sign-up, and SSO callback UI flow
- [x] Per-user workspace bootstrap
- [x] Project listing and active-project selection
- [x] Project creation server action
- [x] Initial intake-session creation for new projects
- [x] `/app` server-side project/session/source bootstrap

### Sources
- [x] Source list loading
- [x] Pasted-text asset creation
- [x] UploadThing integration for mixed source uploads
- [x] Source rename and delete APIs
- [x] Client-side source upload, refresh, retry, and optimistic updates

### Generation
- [x] Internal "Generate Brief" action wired to `POST /api/generate`
- [x] Sync brief generation via `@google/genai` (Gemini 2.5 Flash, Vertex mode)
- [x] PDF source processing — download, parse, chunk via `pdf-text.ts`
- [x] Audio source processing — download, transcribe via Gemini, chunk
- [x] Image source support — base64 passed directly to Gemini vision API
- [x] `SourceChunk` creation for all source types during generation
- [x] Source bundle budget allocation across all sources
- [x] `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef` persistence
- [x] `RevisionEvent` creation for generated snapshots
- [x] Streaming SSE generation with character-by-character animation in the editor
- [x] Unified generate / regenerate button — "Generate Brief" before first snapshot, "Regenerate" after; same `/api/generate` pipeline handles both
- [x] AI chat revision via `/api/revise` with streaming response
- [x] Inline editing and revision navigation

### Internal Editor
- [x] Latest-snapshot loading in `/app`
- [x] Internal document view rendering from real snapshot data
- [x] Project search palette (⌘P)
- [x] Revisions tab with full `RevisionEvent` history
- [x] Revision history enriched with public feedback bodies and authors

### Public Review (Backend)
- [x] Public review comment route and service
- [x] Public review answer route and service
- [x] Public review confirmation route and service
- [x] Public review rate limiting and read-only snapshot guards
- [x] Unit tests for asset services, validators, public auth, public review flows
- [x] Unit tests for brief pipeline, PDF extraction, source processing

### Public Review (UI)
- [x] Wire public comment submission to `/api/public/briefs/[shareToken]/comments`
- [x] Wire public answer submission to `/api/public/briefs/[shareToken]/answers`
- [x] Wire public confirmation submission to `/api/public/briefs/[shareToken]/confirm`
- [x] Surface public mutation success, validation, rate-limit, and read-only errors in the UI
- [x] Show revision history and public feedback inside the internal workspace

---

## In Progress / Partially Done

- [ ] `/brief/[shareToken]` has the real responsive shell and wired submissions, but still renders `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` — not yet backed by real snapshot data
- [ ] Generation supports both sync and async modes; the async path requires `BRIEF_GENERATION_ASYNC=1` and has no job-status UI
- [ ] Right pane chat tab displays messages but the standalone send input is not wired (send only works from document text selection)

---

## Next Engineering Work

### P0 — Close the Public Review Loop

- [ ] Add `createShareLink()` service function in `src/server/services/share-link.ts`
- [ ] Add `POST /api/snapshots/[snapshotId]/share` route
- [ ] Add share button in the internal workspace (doc header or right pane) that shows the generated URL
- [ ] Load real `ShareLink → BriefSnapshot` data in `/brief/[shareToken]/page.tsx` — replace mock requirements and revisions

### P1 — Async Job Status UI

- [ ] Surface `ProcessingJob.status` and `errorCode` in the editor status bar when running in async mode
- [ ] Show a "generation failed" state with error message and retry option
- [ ] Poll job status in async mode and update UI on queued → running → succeeded / failed

### P2 — Job Status & Failure Surface

- [ ] Surface `ProcessingJob.status` and `errorCode` in the editor status bar
- [ ] Show a "generation failed" state with error message and retry option
- [ ] Poll job status in async mode and update UI on queued → running → succeeded / failed

### P3 — Code Quality (Discovered Enhancements)

- [ ] ReDoS risk in `pdf-text.ts` — replace `(?:.|\n|\r)*?` with `[\s\S]*?` in `STREAM_START_PATTERN`
- [ ] Concurrent processing guard in `source-processing.ts` — optimistic status pre-check before starting work
- [ ] Audio processor: add parser-version tracking to `providerMetadata` (like PDF uses `PDF_TEXT_PARSER_VERSION`)
- [ ] Add 10-minute `AbortSignal` timeout to streaming Gemini call in generation pipeline
- [ ] Call `controller.close()` after error event in `api/generate/route.ts` SSE stream
- [ ] Move `PROMPT_BUNDLE_MAX_CHARS = 30_000` to an env-configurable value

### P4 — Test Coverage

- [ ] Implement `pnpm test:e2e` with Playwright (cover: sign-in, create project, upload source, generate brief, share, comment)
- [ ] Implement `pnpm test:a11y` with axe-core or Playwright accessibility checks
- [ ] Expand `source-processing.test.ts`: download failure, empty text result, partial chunk failure
- [ ] Replace placeholder `test:e2e` and `test:a11y` npm scripts with real commands
