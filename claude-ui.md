# Claude UI Handoff

Last reviewed on 2026-05-11.

This document is for Claude to work on the missing UI surface area only.

The backend is partially implemented. The goal is to wire or prepare the frontend without changing the product direction, data contracts, or visual language unnecessarily.

## Working Rule

Do not treat mock UI as complete just because it looks polished.

A UI area is only complete when it:

- reads real data or submits a real mutation
- handles loading, empty, success, and failure states
- matches the current backend contract
- preserves the current design direction unless there is a strong reason to change it

---

## Completed UI Work

This section tracks what has been built. Do not redo this work.

### Design system

- `src/lib/hooks/use-theme.ts` — shared `useTheme()` hook; persists to localStorage key `"rx-theme"`; initialises as `"dark"` on the server to avoid hydration mismatch, then corrects from localStorage on mount
- `src/components/theme-toggle.tsx` — reusable `<ThemeToggle />` client component (Sun/Moon button); used on the landing page
- `src/app/globals.css` — `touch-action: manipulation` on all buttons; `prefers-reduced-motion` media query
- `src/app/layout.tsx` — `colorScheme: "dark"` on `<html>`; `<meta name="theme-color" content="#141517">`
- `src/components/icons.tsx` — added `ArrowRight` icon

### Landing page (`src/app/page.tsx`)

- Theme toggle button fixed to top-right; syncs with editor and brief pages via shared hook
- Nav cards have hover states (`surface-2` background, `border-strong`), animated `ArrowRight` icon on `group-hover`
- Headline uses `text-balance`; description uses `text-pretty`
- Auth buttons have hover and `focus-visible` rings
- Empty footer `<p>` removed

### Internal editor

**`src/components/editor/doc-view.tsx`**

- `AppState` type added: `"no-session" | "no-sources" | "generating" | "failed" | "ready"`
- Each state maps to a distinct empty view with appropriate messaging
- Hardcoded `"payments-v2"` breadcrumbs removed; replaced with nullable `sessionName` prop
- `"Export"` button renamed to `"Generate Brief"`; disabled with tooltip when state is `no-session` or `no-sources`
- `DocLine` requirement rows: `<div onClick>` replaced with `role="button"` + `tabIndex` + `onKeyDown` (Enter/Space)
- `EvidenceBit` tooltip: keyboard accessible via `onFocus`/`onBlur`
- Chat input: `outline-none` removed, `focus-visible:ring` added, `<label htmlFor>` added, placeholder uses real ellipsis `…`
- `DocViewProps` now accepts: `appState`, `sessionName`, `onAddSources`

**`src/components/editor/statusbar.tsx`**

- Removed all hardcoded mock strings (`"main"`, `"UTF-8"`, `"spec/v2.1"`)
- Props: `sessionName` (shows `"—"` when null), `extractStatus` (idle/queued/running/failed)
- `"queued"` status added (info colour dot)

**`src/components/editor/editor-shell.tsx`**

- Uses `useTheme()` hook; theme state removed from local state
- Passes `appState="no-session"` and `sessionName={null}` to `DocView` — honest, no mock
- `handleOpenSources()` opens right panel to Sources tab when DocView CTA is clicked
- Removed hardcoded `projectName="payments-v2"` from `TitleBar`

**`src/components/editor/titlebar.tsx`**

- Removed unused `projectName` prop
- Search trigger has `hover:` and `focus-visible:ring`

**`src/components/editor/right-pane.tsx`** — full visual redesign

- `SourceRow` component: type icon (FileText / MessageSquare for audio), truncated label with inline rename (click-to-edit, blur-to-confirm), `Intl.RelativeTimeFormat` timestamp, status dot, hover-reveal delete with inline confirm ("Delete? Yes / No")
- `TextPasteArea`: expandable textarea (triggered by "Add text source" button), char counter against `TEXT_MAX` (500k), Cancel/Add buttons, loading and error states; calls `onSubmitText` prop
- `SourcesTab` props: `sources`, `loading`, `error`, `onDelete`, `onRename`, `onSubmitText`, `onRetry`
- Loading state: 3 skeleton rows with `animate-pulse`
- Error state: red-toned inline banner with retry link
- Tab strip: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`

### Public brief page

**`src/app/brief/[shareToken]/page.tsx`**

- Uses `useTheme()` hook; theme state removed from local state
- Revision panel: `absolute inset-0 z-20` on mobile (full-screen overlay), `sm:relative` on desktop — the previous `grid-cols-[1fr_240px]` layout was broken on 375px screens

**`src/components/brief/client-header.tsx`**

- Logo: now uses `RxLogo` from `@/components/icons` (canonical 16×16 geometric version). The old `@/components/rx-logo` (24×24 pharmaceutical letterform) is no longer used here
- Mobile: brand name hidden on small screens (`hidden sm:inline`), separator desktop-only, doc name truncates with `min-w-0`, requirement count hidden below `md`, submit button shows "Submit" on mobile / "Submit feedback" on `sm+`
- `aria-label` on both icon buttons; `aria-pressed` on history toggle

**`src/components/brief/client-doc.tsx`**

- Padding: `px-4 py-6 sm:px-12 sm:py-10`
- Meta row: `flex-wrap` to prevent overflow on narrow screens

**`src/components/brief/requirement-card.tsx`**

- Card header split into two flex groups: left (ID + status, `min-w-0`), right (tags + comment button, `flex-wrap`)
- On mobile: stacks vertically (`flex-col gap-1.5`); on `sm+`: single row with spacer (`flex-row`)
- Comment button: `sm:opacity-0 sm:group-hover:opacity-100` — always visible on touch, fade-in on desktop hover
- `type="button"`, `aria-label`, `aria-expanded`, `focus-visible:ring` added

**`src/components/brief/comment-thread.tsx`**

- Removed `autoFocus` (caused keyboard to pop on mobile immediately on open)
- `outline-none` replaced with `focus-visible:ring`
- `<label htmlFor>` added

**`src/components/brief/question-block.tsx`**

- `outline-none` replaced with `focus-visible:ring`
- `<label htmlFor>` added

**`src/components/ui/icon-btn.tsx`**

- `cursor-default` → `cursor-pointer`
- `focus-visible:ring-1 focus-visible:ring-accent` added

---

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

Reality after recent work:

- the shell structure is solid and design-system compliant
- `DocView` has a working state machine but is currently stuck at `"no-session"` — it needs real session context passed in
- `RightPane` sources tab is visually complete with `SourceRow`, `TextPasteArea`, loading/error states — but receives no props yet (all undefined, shows empty state)
- nothing is wired to the asset APIs or the generate API yet

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

Reality after recent work:

- the page is mobile-responsive and design-system compliant
- logo is now consistent with the rest of the app
- comment, answer, and confirmation submissions are still local state only
- the page still uses `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` — hardcoded payments-spec content

---

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

---

## Missing UI Work Ready Now

These are UI tasks Claude can implement immediately against existing routes or existing state boundaries.

### 1. Session context in the app shell

Files to evolve:

- `src/app/app/page.tsx`
- `src/components/editor/editor-shell.tsx`
- `src/components/editor/project-sidebar.tsx`

What is missing:

- `EditorShell` currently passes `appState="no-session"` and `sessionName={null}` because there is no session loader
- the sidebar still shows "No projects yet"
- no project/session creation endpoints currently exist

Constraint:

- work from seeded or server-provided session context rather than inventing fake CRUD
- the app page is a server component — session data can be fetched server-side and passed as props to `EditorShell`

Expected UX:

- if a seeded session exists, show it as the active session in the sidebar and pass `sessionName` to `DocView` and `StatusBar`
- `EditorShell` should accept an optional `session` prop `{ id: string; name: string }` so the shell knows which session to operate on
- if no session is available, the current `"no-session"` empty state is correct — do not fake it

### 2. Wire internal source list

Files to evolve:

- `src/components/editor/editor-shell.tsx`
- `src/components/editor/right-pane.tsx` (props already defined — just needs wiring)

What is missing:

- `RightPane` receives `sources={undefined}` — shows empty state
- needs `GET /api/sessions/[sessionId]/assets` fetch on mount
- needs `DELETE /api/assets/[assetId]` on delete confirm
- needs `PATCH /api/assets/[assetId]` on rename

Depends on: task 1 (session context) — needs `sessionId` before this can be wired

Expected UX:

- fetch on mount, pass `loading={true}` during fetch
- on error, pass `sourcesError` string and `onRetrySourceLoad` callback
- on success, pass `sources` array (map API response to `SourceItem` shape)
- delete and rename call the correct APIs and refresh the list

### 3. Wire pasted-text submission

Files to evolve:

- `src/components/editor/editor-shell.tsx`

What is missing:

- `TextPasteArea` in `RightPane` calls `onSubmitText` prop — this prop is currently `undefined` in `EditorShell`
- needs to call `POST /api/sessions/[sessionId]/assets` with `{ textContent, displayLabel? }`
- on success, refresh the source list

Depends on: task 1 (session context)

Expected UX:

- submit shows "Saving…" in the button during the request
- on success the textarea collapses and the new source appears in the list
- on failure, inline error message in the textarea footer

### 4. Wire generate/regenerate actions

Files to evolve:

- `src/components/editor/doc-view.tsx`
- `src/components/editor/editor-shell.tsx`
- `src/components/editor/statusbar.tsx`

What is missing:

- "Generate Brief" button exists and has the correct disabled states — but `onClick` does nothing yet
- needs to call `POST /api/generate` with the active `sessionId`
- status bar `extractStatus` prop is hardcoded to `"idle"` — should reflect the real job state
- command palette generate action is visual only

Depends on: task 1 (session context)

Expected UX:

- on click: set `appState="generating"` immediately, call API
- API response confirms job is queued: set `extractStatus="queued"` in status bar
- poll or listen for job completion; update `extractStatus` accordingly
- if the pipeline fails (currently always will with `PIPELINE_NOT_IMPLEMENTED`): set `appState="failed"` and `extractStatus="failed"`
- do not fake success

### 5. Wire public comment submission

Files to evolve:

- `src/components/brief/comment-thread.tsx`
- parent component that owns `claimId` / `questionId` / `section`

What is missing:

- `CommentThread` calls `onSubmitComment(text)` — this only updates local state in `RequirementCard`
- needs to POST to `/api/public/briefs/[shareToken]/comments` with the correct body

Expected behavior:

- submit is async: show pending, then success or failure
- on success, keep the submitted comment visible
- on failure, show inline error and allow retry
- pass `claimId` or `questionId` when the comment is anchored to a specific item

### 6. Wire follow-up answer submission

Files to evolve:

- `src/components/brief/question-block.tsx`

What is missing:

- `QuestionBlock` calls `onSubmitAnswer(text)` — only updates local state
- needs to POST to `/api/public/briefs/[shareToken]/answers` with `{ questionId, answer }`

Expected behavior:

- submit is async: show pending in the button
- on success, show confirmed answer state
- on failure, show inline error

### 7. Wire brief confirmation

Files to evolve:

- `src/components/brief/client-header.tsx`

What is missing:

- "Submit feedback" toggles local `submitted` state only
- needs to POST to `/api/public/briefs/[shareToken]/confirm`

Expected behavior:

- submit is async: disable button during request
- on success, show confirmed state permanently (not just a toggle)
- on failure, show inline error and allow retry
- prevent duplicate submits

---

## Missing UI Work Blocked Or Partially Blocked By Backend

These still belong in the UI plan, but Claude should not invent endpoints or fake persistence for them.

### 8. Internal snapshot-backed brief renderer

Files to evolve:

- `src/components/editor/doc-view.tsx`

Current state:

- `DocView` now accepts `appState`, `sessionName`, and `lines` props — it is structurally ready
- when `appState="ready"`, it renders `lines: DocLineData[]` — but this is a line-based format that does not match the real `BriefSnapshot` shape

What should eventually happen:

- replace `DocLineData[]` with real `BriefSnapshot` / `BriefClaim` / `BriefQuestion` / `EvidenceRef` data
- render the brief's summary, goals, ambiguities, and follow-up questions as sections
- support evidence affordances and selection targets

Blocked by:

- no successful snapshot generation path yet
- no snapshot query layer exposed to the UI yet

Claude guidance:

- when the snapshot API is ready, refactor `DocView` to accept snapshot-shaped props directly
- do not keep doubling down on the current line-based mock format

### 9. Revision timeline backed by real events

Files to evolve:

- `src/components/editor/right-pane.tsx`

What should eventually happen:

- `RevisionsTab` currently shows an empty state
- should show persisted revision events for generation, regeneration, comments, answers, and confirmation

Blocked by:

- no UI data loader for revision events yet

### 10. Internal feedback visibility

Files to evolve:

- `src/components/editor/right-pane.tsx`
- `src/components/editor/doc-view.tsx`

What should eventually happen:

- internal users should see public comments and follow-up answers inside the workspace

Blocked by:

- no read-side feedback query surface wired into the app yet

### 11. Public brief page with real snapshot data

Files to evolve:

- `src/app/brief/[shareToken]/page.tsx`
- all `src/components/brief/*`

Current state:

- the page is visually polished and mobile-responsive
- still uses `MOCK_REQUIREMENTS` and `MOCK_REVISIONS`
- the `RequirementCard` model maps well to brief claims but will need rework when real snapshot data has a different shape

Blocked by:

- no implemented read-side share-link loading flow
- share-link creation is not implemented yet

Claude guidance:

- do not overfit the current `RequirementCard` abstraction if it fights the brief contract
- it is acceptable to replace or heavily refactor `RequirementCard` when real data arrives

---

## UI Priorities For Claude

Work in this order:

1. **Session context** — wire a seeded or server-fetched session into `EditorShell` so the app has a real `sessionId` to work with. Everything else in the internal app depends on this.
2. **Source list + text paste** — once `sessionId` is available, wire `GET /api/sessions/[sessionId]/assets` into `RightPane` and `POST /api/sessions/[sessionId]/assets` into `TextPasteArea`. The components are already built.
3. **Generate action** — wire the "Generate Brief" button to `POST /api/generate`. Show queued/running/failed status honestly. The `AppState` machine and `StatusBar` props are already defined.
4. **Public mutations** — wire comment, answer, and confirm POSTs on the brief page. These are self-contained and do not depend on session context.
5. **Snapshot renderer** — refactor `DocView` to accept real `BriefSnapshot` shape when the generation pipeline is working.
6. **Public snapshot data** — replace `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` with real data once the share-link read path is implemented.

---

## Non-Goals For Claude

Claude should not:

- redesign the product into a different visual language
- invent new backend endpoints casually
- change Prisma schema unless explicitly required by a real UI contract issue
- hide the fact that generation is currently unimplemented
- turn the app into a chat-first interface

---

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

---

## Acceptance Bar For UI Work

Claude's UI pass is successful when:

- the internal app is clearly session-based rather than pure mock UI
- users can add text sources and see them in the workspace
- generation can be triggered from the UI and the resulting status is communicated honestly
- the public review actions call real APIs rather than only mutating local state
- no major screen still depends on hardcoded payments-spec demo content unless explicitly marked as temporary
