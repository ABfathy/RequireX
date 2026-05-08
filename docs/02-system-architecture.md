# System Architecture

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

Optional bonus:

- a lightweight access-code gate before the brief is shown

### 3. Storage Layer

`Supabase Storage` stores:

- uploaded audio
- images
- PDFs
- generated previews if needed

`Supabase Postgres` stores:

- projects
- intake sessions
- source asset metadata
- generated brief snapshots
- client comments
- follow-up answers
- revision events
- share links

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
- `/app/projects/[projectId]`
- `/app/projects/[projectId]/sessions/[sessionId]`
- `/app/settings`

### Route Handler Examples

- `POST /api/uploads`
- `POST /api/folder-uploads`
- `POST /api/projects`
- `POST /api/sessions`
- `POST /api/generate`
- `POST /api/regenerate`
- `POST /api/comments`
- `POST /api/follow-up-answers`
- `POST /api/share-links`

## Primary Data Flow

### A. Internal Intake Flow

1. Internal user creates or opens a project.
2. User starts an intake session.
3. User uploads text, audio, image, and/or PDF inputs, either one by one or as one mixed-source folder.
4. Files are stored and metadata is persisted.
5. Generation job is queued.
6. UI shows processing state and partial progress.
7. Job normalizes sources.
8. AI generates a contract-shaped brief.
9. The brief snapshot is stored.
10. The internal user reviews and refines if needed.

### B. Public Review Flow

1. Internal user creates a share link.
2. Client opens the link with minimal friction.
3. Client reads the brief.
4. Client highlights sections or targets specific brief areas with inline comments.
5. Client answers follow-up questions through structured inputs.
6. Internal user reviews feedback.
7. Internal user triggers regeneration into a new snapshot.

### C. Internal Refinement Flow

1. Internal user selects a brief section or claim.
2. User asks the AI to adjust it using extra context.
3. The system stores the request as an event.
4. The AI returns updated structured output.
5. A new snapshot is created.

## Async Job Design

Each extraction/regeneration job should run in durable steps:

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
