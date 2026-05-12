# Task List

## Done

- [x] Clerk auth routes and middleware
- [x] Custom sign-in, sign-up, and SSO callback UI flow
- [x] Per-user workspace bootstrap
- [x] Project listing and active-project selection
- [x] Project creation server action
- [x] Initial intake-session creation for new projects
- [x] `/app` server-side project/session/source bootstrap
- [x] Source list loading
- [x] Pasted-text asset creation
- [x] UploadThing integration for mixed source uploads
- [x] Source rename and delete APIs
- [x] Client-side source upload, refresh, retry, and optimistic updates
- [x] Internal "Generate Brief" action wired to `POST /api/generate`
- [x] Sync text-first brief generation via `@google/genai` in Vertex mode
- [x] `SourceChunk` creation for text assets during generation
- [x] `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef` persistence
- [x] `RevisionEvent` creation for generated snapshots
- [x] Latest-snapshot loading in `/app`
- [x] Internal document view rendering from real snapshot data
- [x] Public review comment route and service
- [x] Public review answer route and service
- [x] Public review confirmation route and service
- [x] Public review rate limiting and read-only snapshot guards
- [x] Unit tests for asset services, validators, public auth, public review flows

## In Progress / Partially Done

- [ ] Public brief page has the real responsive shell and loading state, but still renders `MOCK_REQUIREMENTS` and `MOCK_REVISIONS`
- [ ] Generation supports both sync and async modes, but the sync path is the only ready demo path
- [ ] Regeneration job creation exists in the service layer, but `/api/regenerate` and the UI are still disabled
- [ ] Status UI primitives exist (`AppState`, `StatusBar`, loading/error states), but there is no durable async job tracking/history UI
- [ ] Public review backend mutations are real, but the public page UI still uses local-only submit behavior

## Next Engineering Work

### Backend Work

- [ ] Move file assets beyond `UPLOADED` into real processing states with durable status updates
- [ ] Create `SourceChunk` rows from PDF, audio, and image inputs
- [ ] Add extraction/transcription/observation layers for non-text sources
- [ ] Implement true regeneration from a prior snapshot
- [ ] Add a read-side query surface for revision events and public feedback in the internal workspace
- [ ] Implement share-link creation from the internal workspace
- [ ] Implement share-link/snapshot loading for `/brief/[shareToken]`
- [ ] Decide whether async generation should become the default and harden the Inngest path if so
- [ ] Replace placeholder `test:e2e` and `test:a11y` scripts with real commands and coverage

### Frontend / UI Work

- [ ] Surface async queued/running/failed generation state honestly in `DocView` and `StatusBar`
- [ ] Add retry/regenerate controls to the internal workspace
- [ ] Add job history / failure inspection UI for generation runs
- [ ] Replace public mock brief data with real share-link/snapshot-backed data
- [x] Wire public comment submission to `/api/public/briefs/[shareToken]/comments`
- [x] Wire public answer submission to `/api/public/briefs/[shareToken]/answers`
- [x] Wire public confirmation submission to `/api/public/briefs/[shareToken]/confirm`
- [x] Surface public mutation success, validation, rate-limit, and read-only errors in the UI
- [x] Show revision history and public feedback inside the internal workspace once the read models exist

## Discovered Enhancements

From review of `feat/AI-processing` — non-blocking quality improvements for follow-up:

- [ ] Regex DoS risk in `pdf-text.ts` `STREAM_START_PATTERN` — replace `(?:.|\n|\r)*?` with `[\s\S]*?` to avoid catastrophic backtracking on malformed PDFs
- [ ] Latin-1 encoding assumption in `pdf-text.ts` corrupts non-ASCII PDFs — document the known limitation or replace with a proper PDF parser library
- [ ] No concurrent-processing guard in `source-processing.ts` — two Inngest workers can double-process the same asset; add an optimistic status pre-check in `updateMany` before starting work
- [ ] Audio processor has no parser-version tracking (unlike PDF which uses `PDF_TEXT_PARSER_VERSION`) — stale transcripts won't re-process when the transcription model changes
- [ ] `PROMPT_BUNDLE_MAX_CHARS = 30_000` is a hardcoded magic number in `brief-pipeline.ts` — make it an env-configurable value so it can be tuned without a code change
- [ ] Generation streaming has no server-side timeout in `api/generate/route.ts` — a stalled Gemini call blocks the worker indefinitely; add an `AbortSignal` with a 10-minute cap
- [ ] SSE stream controller not closed after an error event in `api/generate/route.ts` — client stays connected after failure; call `controller.close()` after writing the error event
- [ ] Expand `source-processing.test.ts` coverage: download failure (4xx / 5xx / timeout), empty-text PDF or audio result, and partial chunk-creation failure
