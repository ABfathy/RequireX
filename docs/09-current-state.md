# Current State

Last refreshed: 2026-05-11

## Summary

The app has crossed from scaffold into usable internal shell. Auth, project bootstrap, project creation, source ingestion, internal brief generation, and public review mutation infrastructure are implemented. The main unfinished layer is the public share/review rendering path.

## Internal App

Implemented:

- `/app` requires Clerk auth
- the server page ensures a workspace exists for the current user
- projects are loaded from Prisma
- the active project is chosen from `?projectId=` or the newest updated project
- the earliest intake session for the active project is loaded
- source assets are preloaded into the editor
- the sidebar supports project switching and creating a new project
- the right pane supports pasted text, uploads, rename, delete, refresh, and loading/error states

Generation/rendering:

- the central document view renders the latest `BriefSnapshot` for the active session
- the Generate Brief button runs the text-first sync Vertex AI flow and refreshes the editor

## Uploads And Sources

Implemented:

- UploadThing route handler is live
- mixed uploads accept image, PDF, and audio-compatible source files
- pasted text persists directly to `SourceAsset`
- asset deletion is restricted to `UPLOADED` and `FAILED`

Current limitation:

- file assets stop at `SourceAsset`; the live generation path is text-first

## Generation

Implemented:

- `/api/generate` creates generation jobs and runs sync brief generation by default
- `/api/regenerate` creates regeneration jobs
- text sources are normalized into `SourceChunk` rows when generation runs
- `@google/genai` calls Vertex AI Gemini 2.5 Flash in Vertex mode
- successful runs persist `BriefSnapshot`, claims, questions, evidence refs, and a `GENERATED` revision event
- Inngest generation dispatch remains available behind `BRIEF_GENERATION_ASYNC=1`
- job-dispatch failures are written back onto the `ProcessingJob`

Current limitation:

- generation only includes text sources in the prompt
- regeneration UI is not wired yet

## Public Review

Implemented:

- comment submission route and service
- follow-up answer route and service
- confirmation route and service
- share-link expiry/inactive checks
- snapshot mutability checks
- basic in-memory rate limiting by action + share token + IP
- revision event creation for public mutations

Current limitation:

- `/brief/[shareToken]` still renders mock requirements and revisions instead of database-backed snapshot data

## Tests

Implemented:

- Vitest suite for service and route logic

Current limitation:

- no e2e, no accessibility automation, no live UI integration tests
