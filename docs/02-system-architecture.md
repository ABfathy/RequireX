# System Architecture

## Route Surfaces

- `/`: landing page
- `/app`: internal editor workspace behind Clerk auth
- `/brief/[shareToken]`: public client review surface, currently mock-data driven
- `/sign-in`, `/sign-up`: Clerk auth routes
- `/api/projects`: bundled internal project/session/source bootstrap payload
- `/api/sessions/[sessionId]/assets`: list assets and create pasted-text assets
- `/api/assets/[assetId]`: rename or delete an asset
- `/api/uploadthing`: UploadThing handler
- `/api/generate`: request brief generation
- `/api/regenerate`: request brief regeneration
- `/api/public/briefs/[shareToken]/*`: public comment, answer, and confirm mutations
- `/api/inngest`: Inngest endpoint

## Internal Workspace Flow

1. `requireInternalAuth()` resolves the Clerk user.
2. `ensureWorkspaceForUser()` upserts a per-user workspace.
3. `/app/page.tsx` lists that user's active projects.
4. The selected project's earliest `IntakeSession` is loaded.
5. Source assets for that session are loaded into `EditorShell`.
6. `EditorShell` handles source CRUD and uploads from the client.

The internal editor already supports:

- project switching
- project creation
- source listing
- pasted text ingestion
- UploadThing uploads
- optimistic rename/delete

The internal editor does not yet support:

- live brief generation results
- snapshot browsing
- live revisions
- share-link creation

## Public Review Flow

Public review mutations are real even though the page UI is still mock-backed.

- `POST /comments` validates payloads and records `BriefComment`
- `POST /answers` validates payloads and records `FollowUpAnswer`
- `POST /confirm` confirms a shared snapshot

Those flows also:

- enforce in-memory IP/token rate limiting
- reject expired or inactive share links
- reject writes to non-`SHARED` snapshots
- create `RevisionEvent` audit rows

## Async Generation Flow

1. Internal client posts a `sessionId` to `/api/generate` or `/api/regenerate`.
2. `requestBriefGeneration()` or `requestBriefRegeneration()` creates a `ProcessingJob`.
3. An Inngest event is dispatched.
4. The Inngest function marks the job `RUNNING`.
5. The function then deliberately fails the job as unimplemented.

This means job dispatch and failure handling are implemented, but no extraction or snapshot creation occurs yet.

## Data Model

Core relation chain:

`Workspace -> Project -> IntakeSession -> SourceAsset -> SourceChunk`

Generated-output chain:

`IntakeSession -> BriefSnapshot -> BriefClaim / BriefQuestion -> EvidenceRef`

Public review chain:

`BriefSnapshot -> ShareLink -> BriefComment / FollowUpAnswer`

Audit chain:

`Project / IntakeSession / BriefSnapshot -> RevisionEvent`

## Current Architectural Truths

- There is one workspace per Clerk user.
- Projects are currently listed by `createdBy`, not by broader workspace membership.
- New projects automatically create one initial intake session.
- The app currently assumes the earliest session for a project is the active one.
- The public brief page has not been connected to `ShareLink` + `BriefSnapshot` data yet.
