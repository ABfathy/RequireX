# Current State

Last refreshed: 2026-05-11

## Summary

The app has crossed from scaffold into usable internal shell. Auth, project bootstrap, project creation, source ingestion, and public review mutation infrastructure are implemented. The repo's main unfinished layer is the actual AI processing and snapshot rendering path.

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

Current limitation:

- the central document view is still a shell and does not render real brief snapshots

## Uploads And Sources

Implemented:

- UploadThing route handler is live
- mixed uploads accept image, PDF, and audio-compatible source files
- pasted text persists directly to `SourceAsset`
- asset deletion is restricted to `UPLOADED` and `FAILED`

Current limitation:

- assets stop at `SourceAsset`; there is no chunking or processing pipeline yet

## Generation

Implemented:

- `/api/generate` creates generation jobs
- `/api/regenerate` creates regeneration jobs
- Inngest receives both event types
- job-dispatch failures are written back onto the `ProcessingJob`

Current limitation:

- both Inngest functions deliberately fail with `PIPELINE_NOT_IMPLEMENTED`
- no `BriefSnapshot` rows are created by generation today

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
