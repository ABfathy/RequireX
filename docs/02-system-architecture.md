# System Architecture

## Current Implementation Note

This architecture is still directionally correct, but the live repo only implements part of it today.

Already real in code:

- protected internal app access with Clerk
- public review mutation routes for comments, answers, and confirmation
- UploadThing-backed file intake routes
- asset persistence for uploaded files and pasted text
- generation/regeneration request APIs backed by persisted processing jobs
- Prisma models for projects, sessions, assets, chunks, snapshots, evidence, comments, answers, share links, revision events, and jobs

Still target-state rather than implemented:

- the actual AI generation pipeline
- source normalization and chunk creation jobs
- snapshot rendering in the internal and public UIs
- project/session creation flows
- share-link creation flow

## Architecture Goal

Ship a focused intake-and-briefing web app that:

- accepts messy client inputs
- processes them asynchronously
- generates a structured brief with evidence references
- supports internal refinement
- supports public client review with minimal friction

## Top-Level System

### 1. Web App

`Next.js` App Router serves:

- authenticated internal workspace
- public brief review links
- route handlers for uploads, comments, and regeneration triggers
- an optional landing page only if time remains after the core workflow is stable

### 2. Auth Layer

`Clerk` protects internal routes:

- `/app/...`
- private API endpoints

Public routes stay open:

- `/brief/[shareToken]`
- `/api/public/briefs/[shareToken]/comments`
- `/api/public/briefs/[shareToken]/answers`
- `/api/public/briefs/[shareToken]/confirm`

Public write boundary:

- public review writes do not use Clerk
- possession of a valid share token is the public write credential in v1
- public writes require an `ACTIVE`, unexpired `ShareLink`
- public writes are allowed only while the linked snapshot is `SHARED`
- `CONFIRMED` and `SUPERSEDED` snapshots stay readable but become write-closed

Optional bonus:

- a lightweight access-code gate before the brief is shown

### 3. Storage Layer

`UploadThing` stores:

- uploaded audio
- images
- PDFs
- any later generated file-backed previews if needed

`Supabase Postgres` stores:

- projects
- intake sessions
- source asset metadata
- normalized source chunks
- generated brief snapshots
- client comments
- follow-up answers
- revision events
- share links
- processing jobs

Special case:

- pasted text does not go through `UploadThing`
- it is persisted directly as a `SourceAsset` row with inline text content

### 4. Job Layer

`Inngest` handles:

- extraction jobs
- regeneration jobs
- retries
- multi-step source normalization

### 5. AI Layer

`Vertex AI` via `@google/genai` handles:

- multimodal understanding
- brief generation
- ambiguity detection
- rewrite/refinement operations

## Main Product Model

### Workspace Model

- one shared internal workspace in v1
- multiple teammates can sign in

### Project Model

A `Project` is the top-level container.

Each project represents one client and one source of truth.

Projects can still contain multiple chats or intake sessions over time, but they do not contain multiple clients.

### Session Model

An `IntakeSession` represents one intake attempt or chat branch inside a project.

Use sessions for:

- different uploads
- different rounds of context
- separate intake conversations for the same client

### Brief Model

Each generation creates a `BriefSnapshot`.

Snapshots are versioned and tied to:

- a project
- a session
- a normalized source bundle

## Internal UI Layout

Desktop-first layout:

- left rail: projects and sessions
- center pane: active brief
- bottom pane: AI refinement composer
- right pane: source assets, timeline, revisions, comments, and prior AI chat

Mobile support:

- left rail collapses into drawer
- right pane becomes sheet or tabbed inspector
- center brief remains readable
- public review stays fully usable

## Route Model

### Public Routes

- `/`
- `/brief/[shareToken]`

### Internal Routes

- `/app`

Planned later if the internal app is expanded beyond the current shell:

- `/app/projects/[projectId]`
- `/app/projects/[projectId]/sessions/[sessionId]`
- `/app/settings`

### Current Route Handlers

- `POST /api/uploadthing`
- `GET /api/sessions/[sessionId]/assets`
- `POST /api/sessions/[sessionId]/assets`
- `PATCH /api/assets/[assetId]`
- `DELETE /api/assets/[assetId]`
- `POST /api/generate`
- `POST /api/regenerate`
- `POST /api/public/briefs/[shareToken]/comments`
- `POST /api/public/briefs/[shareToken]/answers`
- `POST /api/public/briefs/[shareToken]/confirm`
- `POST /api/inngest`

### Planned Route Handlers

- `POST /api/projects`
- `POST /api/sessions`
- `POST /api/share-links`

## Primary Data Flow

### A. Internal Intake Flow

1. Internal user opens the internal workspace.
2. The target end state is that the user creates or opens a project and session, but those creation flows are not wired yet.
3. Text and file intake APIs already exist for session assets.
4. File inputs are stored through `UploadThing`, and source metadata is persisted in Postgres.
5. Generation can already be requested and a processing job is queued.
6. The current gap is that the Inngest pipeline stops at `PIPELINE_NOT_IMPLEMENTED`.
7. The intended next behavior is source normalization into chunks, AI generation, snapshot persistence, and brief rendering.

### B. Public Review Flow

1. The backend shape assumes an internal user creates a share link, but share-link creation is not implemented yet.
2. The public route exists, but the page is still mock-backed.
3. The public mutation backend for comments, answers, and confirmation is already implemented once a valid share link exists.
4. The missing piece is loading a real snapshot into the page and wiring the UI to those APIs.

### C. Internal Refinement Flow

1. Internal user selects a brief section or claim.
2. User asks the AI to adjust it using extra context.
3. The system stores the request as an event.
4. The AI returns updated structured output.
5. A new snapshot is created.

## Async Job Design

Target durable job design:

1. validate request
2. fetch source asset metadata
3. parse or normalize text input
4. transcribe audio if present
5. extract PDF text and page references
6. run image interpretation if present
7. build normalized source bundle
8. call Vertex AI
9. validate output against brief contract
10. persist snapshot and revision event
11. mark job complete

Retry policy:

- retry transient external failures
- do not duplicate snapshots on replay
- treat invalid contract output as a handled failure with explicit error state

## SourceAsset Status Ownership

**Workstream 4 responsibility:** Intake layer writes `UPLOADED` status when asset is first persisted.

**Workstream 5 responsibility:** Inngest jobs own all subsequent status transitions:
- `QUEUED` — job created, awaiting execution
- `PROCESSING` — job running, normalizing source
- `PROCESSED` — source chunks created, ready for generation
- `FAILED` — error in extraction or processing

Never skip states. Status is a reliable signal of what work has been done and what chunks exist.

## Revision and History Model

Use simplified event history plus stable snapshots.

Store:

- `generated`
- `regenerated`
- `manual_edit`
- `client_comment_added`
- `client_answer_added`
- `snapshot_restored`

This gives:

- quick rollback
- clear audit trail
- lower complexity than a full replay engine

## Evidence and Citation UX

Evidence is claim-level.

Each generated claim or question should carry one or more references that can open:

- source type
- source label
- locator
- excerpt
- preview link when available

UI rule:

- use compact citation affordances
- do not clutter the main text with dense inline markers
- public review should stay brief-first and should not become a client chat surface

## Performance Rules

- public and internal routes should render meaningful loading states quickly
- long-running extraction must never rely on a single blocking request
- decorative motion must not delay main content
- novelty libraries stay out of the hot path for brief readability
