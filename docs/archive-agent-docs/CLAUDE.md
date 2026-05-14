# CLAUDE.md

This repository is a TypeScript-only Next.js app for AI-assisted intake and brief generation.

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
pnpm test
pnpm prisma:migrate
pnpm prisma:generate
pnpm prisma:seed
pnpm prisma:studio
```

`pnpm test` and `pnpm test:unit` run the current Vitest suite. `pnpm test:e2e` and `pnpm test:a11y` are still placeholders.

## High-Level Architecture

- `/` is the landing page
- `/app/**` is the protected internal workspace
- `/brief/[shareToken]` is the public review route
- `/api/generate` creates a job and runs the full Vertex AI generation pipeline synchronously by default (text + PDF + audio + image sources)
- `/api/regenerate` returns 410 — the endpoint is disabled; the Inngest function exists but the UI is not wired
- `/api/revise` streams AI revisions from a user chat message
- `/api/sessions/[sessionId]/revisions` returns revision history enriched with public feedback bodies

Core relation chain:

`Workspace -> Project -> IntakeSession -> SourceAsset -> SourceChunk`

Generated-output chain:

`IntakeSession -> BriefSnapshot -> BriefClaim / BriefQuestion -> EvidenceRef`

## Current Implementation Status

Implemented:

- Clerk auth and custom auth pages
- per-user workspace bootstrap
- project listing and project creation
- source asset listing, creation, upload, rename, and delete
- UploadThing route handlers
- PDF text extraction (`src/server/services/pdf-text.ts`) and audio transcription via Gemini
- file source processing pipeline — PDF/audio downloaded, chunked, and merged into generation prompt
- image sources passed directly to Gemini vision API
- sync Vertex AI brief generation through `@google/genai` (Gemini 2.5 Flash)
- streaming SSE brief generation with character-by-character animation in the editor
- unified generate / regenerate button — "Generate Brief" before first snapshot, "Regenerate" after; same `/api/generate` pipeline handles both
- AI chat revision (`/api/revise`) with streaming response
- latest snapshot rendering in the internal editor
- revision history tab in the right pane, enriched with public feedback bodies and authors
- public review mutations (comment, answer, confirm) with rate limiting and revision events
- public review UI wired to real API endpoints with error handling
- async job status polling — `GET /api/jobs/[jobId]` surfaced in the status bar; failed state shows error + Retry button

Not implemented / not wired:

- share-link creation (no API endpoint, no service function, no UI button)
- `/brief/[shareToken]` still renders `MOCK_REQUIREMENTS` — not wired to real snapshot data
- chat tab in right pane is a display-only shell — no message send action
- e2e and accessibility automation (placeholder scripts only)

## Auth Rules

- Use `requireInternalAuth()` or `requireInternalActor()` on internal server entry points.
- Never trust a client-supplied user ID.
- Signed-in users hitting `/sign-in` or `/sign-up` are redirected away by middleware.

## Environment

- Use `src/lib/env/server.ts` and `src/lib/env/client.ts`.
- Do not read `process.env` directly in app code.
- `SEED_USER_ID` must be set before `pnpm prisma:seed` if you want seeded rows tied to your Clerk user.
- Brief generation requires `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, and Application Default Credentials through `GOOGLE_APPLICATION_CREDENTIALS`.
- `BRIEF_GENERATION_ASYNC=1` switches `/api/generate` back to Inngest dispatch; default `0` runs synchronously inside the request.

## Source Ingestion

- Text sources are created through `POST /api/sessions/[sessionId]/assets`.
- File uploads go through UploadThing and persist `SourceAsset` rows on upload completion.
- When generation runs, `processSessionFileSources()` downloads and processes PDF and audio assets before building the prompt bundle.
- PDF assets are parsed with the built-in `pdf-text.ts` extractor (Flate/ASCII85 streams).
- Audio assets are transcribed to English via `transcribeAudioToEnglish()` in `google-genai.ts`.
- Image assets are passed directly as base64 to the Gemini vision model.
- All file types are chunked into `SourceChunk` rows and included in the `EvidenceRef` tree.
- Delete is only allowed for `UPLOADED` and `FAILED` assets.

## Testing

- `pnpm test` runs the Vitest suite (11 test files, 93 tests).
- Coverage: validators, asset services, brief pipeline, PDF extraction, source processing, public auth, public review services and routes.
- `pnpm test:e2e` and `pnpm test:a11y` are placeholder scripts — not yet implemented.
