# Current State

Last refreshed: 2026-05-14

## Summary

The full product loop is implemented end-to-end. Auth → source upload → brief generation (text, PDF, audio, image) → streaming editor → AI chat revision → share-link creation → public client review → revision history with client feedback visible internally. The only outstanding UI wiring is the standalone chat send input (chat currently only sends from document text selection).

---

## Internal Workspace

**Working end-to-end:**

- Clerk auth with custom sign-in / sign-up pages; middleware enforces protection on `/app/**`
- Workspace bootstrap, project listing, project creation, active-project switching
- Source panel: pasted text, file uploads (PDF, audio, image), rename, delete, preview
- Generate / Regenerate: unified button shows "Generate Brief" before the first snapshot, "Regenerate" after; downloads file sources, processes PDF/audio/image, builds prompt bundle, calls Gemini 2.5 Flash, streams tokens to editor with character animation
- AI chat revision: user sends a message from the right pane or document text selection, Gemini streams a revised brief, revision is persisted and navigable
- Revision history tab: full `RevisionEvent` list with type colouring; client feedback bodies and authors shown inline for `CLIENT_COMMENT_ADDED` / `CLIENT_ANSWER_ADDED` events
- Share-link creation: "Share" button in the doc header opens a modal that calls `POST /api/snapshots/[snapshotId]/share`, generates a cryptographically random token, sets the snapshot to `SHARED`, and presents a copy-able client URL

**Not wired:**

- Chat tab standalone send input is display-only; send action only triggers from document text selection

---

## Source Processing

**Working:**

- PDF: assets downloaded from UploadThing, parsed with built-in stream extractor (`pdf-text.ts`), chunked into `SourceChunk` rows, included in generation prompt
- Audio: downloaded, transcribed to English via Gemini (`transcribeAudioToEnglish()`), chunked
- Image: passed directly as base64 to Gemini vision API without pre-processing
- Text: normalised and chunked inline during generation

**Known limits:**

- PDF parser uses a pure-JS stream reader — non-ASCII (UTF-8) PDFs may lose characters; `latin1` encoding assumption
- No concurrency lock on asset processing — two Inngest workers could double-process the same asset
- Audio processor has no parser-version field; stale transcripts will not re-process when the transcription model changes

---

## Generation

**Working:**

- Sync path (default): full pipeline runs inside the HTTP request; SSE stream returned to client
- Async path (`BRIEF_GENERATION_ASYNC=1`): Inngest event dispatched; `ProcessingJob` status polled via `GET /api/jobs/[jobId]` and shown in the status bar (queued → running → idle/failed)
- Generation failure surfaces error message in the document view with a Retry button
- Unified generate / regenerate button — shows "Generate Brief" before first snapshot, "Regenerate" after
- Source bundle assembly passes each source's full text to the model; each asset is independently capped at `PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE` (default 750 000 chars — well within Gemini 2.5 Flash's 1 M-token context window)
- Gemini output validated against JSON schema; retried once on parse failure
- `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, `EvidenceRef` persisted in a single Prisma transaction
- `GENERATED` / `REGENERATED` revision event written per run

**Known limits:**

- No server-side timeout on the streaming Gemini call — a stalled request hangs the worker
- SSE stream controller not explicitly closed after error events

---

## Public Review

**Working:**

- Share-link creation: `POST /api/snapshots/[snapshotId]/share` creates or returns an existing active `ShareLink`; snapshot status set to `SHARED`
- `/brief/[shareToken]` loads real `BriefSnapshot` data from the database — claims, questions, comments, revision history, and diagrams
- Comment, answer, and confirm mutation routes fully implemented and tested
- Share-link validation (token lookup, expiry, status)
- Snapshot mutability guard (only `SHARED` snapshots accept mutations)
- In-memory rate limiting per action + share token + IP
- Revision events written for every public mutation
- Public brief page shell is responsive and themed; submission handlers wired to real APIs

---

## Demo Views

Landing page cards route to static demo views (no login or DB required):

- `/demo/workspace` — full `EditorShell` with static Softworks Retail App data (4 processed sources, generated brief with claims and ambiguities)
- `/demo/brief` — full `PublicBriefView` with static data (10 claims, 3 questions, 2 comments, 1 flowchart diagram)

---

## Tests

- 11 Vitest unit test files, 93 tests — all passing
- Covered: validators, asset CRUD, brief pipeline, PDF extraction, source processing, public auth, public review services and routes
- `pnpm test:e2e` and `pnpm test:a11y` — placeholder scripts only; no real coverage
