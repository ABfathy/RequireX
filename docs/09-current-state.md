# Current State

Last refreshed: 2026-05-13

## Summary

The internal workspace is end-to-end functional: auth → source upload → brief generation (text, PDF, audio, image) → streaming editor view → AI chat revision → revision history. The public review mutation surface is fully wired. The two remaining gaps before the full public loop closes are **share-link creation** and **binding the public brief page to real snapshot data**.

---

## Internal Workspace

**Working end-to-end:**

- Clerk auth with custom sign-in / sign-up pages; middleware enforces protection
- Workspace bootstrap, project listing, project creation, active-project switching
- Source panel: pasted text, file uploads (PDF, audio, image), rename, delete, preview
- Generate / Regenerate: unified button shows "Generate Brief" before the first snapshot, "Regenerate" after; downloads file sources, processes PDF/audio/image, builds prompt bundle, calls Gemini 2.5 Flash, streams tokens to editor with character animation
- AI chat revision: user sends a message from the right pane or selection, Gemini streams a revised brief, revision is persisted and navigable
- Revision history tab: full `RevisionEvent` list with type colouring; client feedback bodies and authors shown inline for `CLIENT_COMMENT_ADDED` / `CLIENT_ANSWER_ADDED` events

**Not wired:**

- No share-link creation button — `ShareLink` model is ready but no creation path exists
- Chat tab "send" input is display-only; send action only triggers from document text selection

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
- `GENERATED` revision event written per run

**Known limits:**

- No server-side timeout on the streaming Gemini call — a stalled request hangs the worker
- SSE stream controller not explicitly closed after error events
- Per-source prompt ceiling is env-configurable (`PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE`, default 750 000); no truncation expected for any realistic source

---

## Public Review

**Working:**

- Comment, answer, and confirm mutation routes fully implemented and tested
- Share-link validation (token lookup, expiry, status)
- Snapshot mutability guard (only `SHARED` snapshots accept mutations)
- In-memory rate limiting per action + share token + IP
- Revision events written for every public mutation
- Public brief page shell is responsive and themed; submission handlers wired to real APIs

**Not working:**

- `/brief/[shareToken]` renders `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` — no code reads the real `BriefSnapshot` from the database for display
- No share-link creation path; tokens cannot be generated from the internal workspace

---

## Tests

- 11 Vitest unit test files, 93 tests — all passing
- Covered: validators, asset CRUD, brief pipeline, PDF extraction, source processing, public auth, public review services and routes
- `pnpm test:e2e` and `pnpm test:a11y` — placeholder scripts only; no real coverage
