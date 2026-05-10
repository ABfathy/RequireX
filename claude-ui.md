# Claude UI Handoff

Last reviewed on 2026-05-10.

This document is for Claude to work on the missing UI surface area only.

The backend is partially implemented. The goal is to wire or prepare the frontend without changing the product direction, data contracts, or visual language unnecessarily.

## Working Rule

Do not treat mock UI as complete just because it looks polished.

A UI area is only complete when it:

- reads real data or submits a real mutation
- handles loading, empty, success, and failure states
- matches the current backend contract
- preserves the current design direction unless there is a strong reason to change it

## Existing UI Surface

### Internal app

Current internal entrypoint:

- `src/app/app/page.tsx`

Current internal shell components:

- `src/components/editor/editor-shell.tsx`
- `src/components/editor/titlebar.tsx`
- `src/components/editor/project-sidebar.tsx`
- `src/components/editor/doc-view.tsx`
- `src/components/editor/right-pane.tsx`
- `src/components/editor/statusbar.tsx`
- `src/components/editor/command-palette.tsx`

Reality:

- the shell is visually built
- it is mostly empty-state or mock-state driven
- it is not connected to real projects, sessions, assets, snapshots, or revision events

### Public app

Current public entrypoint:

- `src/app/brief/[shareToken]/page.tsx`

Current public review components:

- `src/components/brief/client-doc.tsx`
- `src/components/brief/client-header.tsx`
- `src/components/brief/requirement-card.tsx`
- `src/components/brief/comment-thread.tsx`
- `src/components/brief/question-block.tsx`
- `src/components/brief/revision-panel.tsx`

Reality:

- the page is polished but uses hardcoded mock data
- comment submission, answer submission, and confirmation are local state only
- the public mutation backend exists, but the UI is not wired to it

## Existing Backend Contracts Claude Can Use

### Internal asset APIs

- `GET /api/sessions/[sessionId]/assets`
- `POST /api/sessions/[sessionId]/assets`
- `PATCH /api/assets/[assetId]`
- `DELETE /api/assets/[assetId]`

Use these for:

- source list rendering
- pasted text submission
- asset rename
- asset delete

### Generation APIs

- `POST /api/generate`
- `POST /api/regenerate`

Use these for:

- generate brief action
- regenerate brief action

Important:

- these APIs currently only queue jobs
- the actual Inngest pipeline still fails with `PIPELINE_NOT_IMPLEMENTED`
- the UI must reflect queued/running/failed states honestly

### Public review APIs

- `POST /api/public/briefs/[shareToken]/comments`
- `POST /api/public/briefs/[shareToken]/answers`
- `POST /api/public/briefs/[shareToken]/confirm`

Use these for:

- comment submission
- follow-up answer submission
- brief confirmation

## Missing UI Work Ready Now

These are UI tasks Claude can implement immediately against existing routes or existing state boundaries.

### 1. Internal source panel wiring

Files to evolve:

- `src/components/editor/right-pane.tsx`
- `src/components/editor/editor-shell.tsx`

What is missing:

- fetch and render real session assets
- show source type, label, filename, status, and created time
- support rename and delete actions
- support a clear “add source” interaction path
- replace the current empty-state-only sources tab

Expected UX:

- if no assets exist, keep a strong empty state
- if assets exist, render them as a usable list
- if the list is loading, show a loading state
- if a request fails, show a failure state and retry path

### 2. Internal pasted-text intake UI

Files to evolve:

- `src/components/editor/doc-view.tsx`
- possibly `src/components/editor/right-pane.tsx`

What is missing:

- the bottom composer currently clears local input only
- it should support submitting pasted text into the active session through `POST /api/sessions/[sessionId]/assets`

Expected UX:

- allow a user to paste raw client context
- submit it into the session as a text asset
- clear the input on success
- surface inline error feedback on failure

### 3. Internal generate/regenerate actions

Files to evolve:

- `src/components/editor/titlebar.tsx`
- `src/components/editor/doc-view.tsx`
- `src/components/editor/statusbar.tsx`
- `src/components/editor/command-palette.tsx`

What is missing:

- there is no real generate button wired to the API
- command palette actions are visual only
- status bar is not connected to real processing state

Expected UX:

- a user can trigger generation for the active session
- the UI shows that a job was queued
- if the backend reports failure, the UI shows failure explicitly
- do not fake success while the pipeline is unimplemented

### 4. Internal sidebar with real session context

Files to evolve:

- `src/components/editor/project-sidebar.tsx`
- `src/components/editor/editor-shell.tsx`

What is missing:

- sidebar still shows “No projects yet”
- there is no real active project/session context in the app shell

Constraint:

- no project/session creation endpoints currently exist
- this means the near-term UI should likely work from seeded or server-provided current-session context rather than pretending full CRUD already exists

Expected UX:

- show current project/session when available
- allow navigation between available seeded or queried sessions if that data is exposed
- if backend support is absent, prepare the component structure without inventing fake persistence

### 5. Internal loading, empty, and failure states

Files to evolve:

- `src/components/editor/doc-view.tsx`
- `src/components/editor/right-pane.tsx`
- `src/components/editor/project-sidebar.tsx`
- `src/components/editor/statusbar.tsx`

What is missing:

- empty states exist
- loading and failure states tied to real async work largely do not

Expected UX:

- distinguish between:
  - no session selected
  - no assets yet
  - generation not started
  - generation running
  - generation failed
  - snapshot exists

## Missing UI Work Blocked Or Partially Blocked By Backend

These still belong in the UI plan, but Claude should not invent endpoints or fake persistence for them.

### 6. Internal snapshot-backed brief renderer

Files to evolve:

- `src/components/editor/doc-view.tsx`

Current problem:

- the document view is modeled like a requirements editor with line-based mock content
- the actual product brief shape is summary, goals, ambiguities, and follow-up questions

What should eventually happen:

- render persisted `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, and `EvidenceRef` data
- map the real brief sections into the center pane
- support evidence affordances and selection targets

Blocked by:

- there is no successful snapshot generation path yet
- there is no snapshot query layer exposed to the UI yet

Claude guidance:

- it is fine to refactor the renderer so it can accept real snapshot-shaped props later
- do not keep doubling down on the current payments-spec mock format

### 7. Revision timeline backed by real events

Files to evolve:

- `src/components/editor/right-pane.tsx`
- maybe reuse patterns from `src/components/brief/revision-panel.tsx`

What should eventually happen:

- show persisted revision events for generation, regeneration, comments, answers, and confirmation

Blocked by:

- no UI data loader for revision events yet

### 8. Internal feedback visibility

Files to evolve:

- `src/components/editor/right-pane.tsx`
- `src/components/editor/doc-view.tsx`

What should eventually happen:

- internal users should see public comments and follow-up answers inside the workspace

Blocked by:

- no read-side feedback query surface is wired into the app yet

### 9. Public brief page with real snapshot data

Files to evolve:

- `src/app/brief/[shareToken]/page.tsx`
- all `src/components/brief/*`

Current problem:

- the public page uses `MOCK_REQUIREMENTS` and `MOCK_REVISIONS`
- the visual model is a requirements-spec UI, not the actual brief contract

What should eventually happen:

- render real snapshot data for summary, goals, ambiguities, and follow-up questions
- show evidence or citation affordances where appropriate
- keep the public page brief-first and readable

Blocked by:

- no implemented read-side share-link loading flow is visible in the current app code
- share-link creation is also not implemented yet

Claude guidance:

- do not overfit the current `RequirementCard` abstraction if it fights the brief contract
- it is acceptable to replace or heavily refactor these components

## Public UI Work Ready Once Real Snapshot Data Is Available

These are the specific behaviors the public page should support as soon as the page receives real data.

### 10. Wire public comments

Files to evolve:

- `src/components/brief/comment-thread.tsx`
- any parent component that owns the target claim/question/section IDs

What is missing:

- current comment submission only updates local state

Expected behavior:

- submit to `/api/public/briefs/[shareToken]/comments`
- pass the correct section and anchor type
- pass `claimId` or `questionId` when relevant
- show submit pending, success, validation, and failure states

### 11. Wire follow-up answers

Files to evolve:

- `src/components/brief/question-block.tsx`

What is missing:

- current answer submission only updates local state

Expected behavior:

- submit to `/api/public/briefs/[shareToken]/answers`
- pass the real `questionId`
- show pending, success, validation, and failure states

### 12. Wire brief confirmation

Files to evolve:

- `src/components/brief/client-header.tsx`
- or move the action to a more appropriate location if needed

What is missing:

- confirmation is currently a local `submitted` toggle

Expected behavior:

- submit to `/api/public/briefs/[shareToken]/confirm`
- show a non-fake confirmed state
- prevent duplicate noisy submits

## UI Priorities For Claude

If Claude is doing the UI in order, use this sequence:

1. Wire internal source list, pasted-text submission, and generate action.
2. Make internal loading and failure states honest.
3. Refactor the internal document pane so it can accept real brief snapshot props later.
4. Refactor the public page away from the current hardcoded requirements-spec model.
5. Wire public comment, answer, and confirm mutations.
6. Add responsive fixes for the public page and a lighter fallback for the internal app.

## Non-Goals For Claude

Claude should not:

- redesign the product into a different visual language
- invent new backend endpoints casually
- change Prisma schema unless explicitly required by a real UI contract issue
- hide the fact that generation is currently unimplemented
- turn the app into a chat-first interface

## Preferred Design Direction

Keep:

- the desktop-first internal shell
- the current restrained product styling
- brief-first reading as the core interaction model

Improve:

- honesty of system status
- data wiring
- action clarity
- state handling
- mobile usability on the public review path

## Acceptance Bar For UI Work

Claude’s UI pass is successful when:

- the internal app is clearly session-based rather than pure mock UI
- users can add text sources and see them in the workspace
- generation can be triggered from the UI and the resulting status is communicated honestly
- the public review actions call real APIs rather than only mutating local state
- no major screen still depends on hardcoded payments-spec demo content unless explicitly marked as temporary
