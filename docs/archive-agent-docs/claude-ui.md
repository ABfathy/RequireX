# Claude UI Handoff

Last reviewed on 2026-05-11 (Session 4).

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

### Session 3 — auth + hydration + brief loading

**Sign-in / sign-up flow** (`src/app/sign-in/**`, `src/app/sign-up/**`, `src/components/providers.tsx`, `src/lib/env/client.ts`, `src/proxy.ts`, `src/app/page.tsx`)

- `<ClerkProvider>` in `providers.tsx` now receives `signInUrl` / `signUpUrl` / `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` from `clientEnv`. The four env vars are **required** in the zod schema. This is the canonical place for sign-in routing — do not re-add `forceRedirectUrl` on individual buttons.
- All four auth pages (`/sign-in`, `/sign-up`, and both `sso-callback` routes) are client components that watch `useAuth().isSignedIn` and call `router.replace("/app")` on success. The replace (not push) drops the auth route from history so Back from `/app` doesn't land on a stale form. Spinner placeholder during the cookie-set → navigation window prevents the previous blank-frame.
- Middleware redirects signed-in users hitting `/sign-in` or `/sign-up` to `/`, not `/app`. Safety net for manual URL entry.
- OAuth screens on `accounts.google.com` remain in browser history — that's owned by the browser; only popup-mode OAuth could remove them.

**Hydration fix across all theme consumers** (`src/components/theme-toggle.tsx`, `src/app/brief/[shareToken]/page.tsx`, `src/components/editor/editor-shell.tsx`, `src/components/brief/client-header.tsx`, `src/components/editor/titlebar.tsx`)

- Created `src/lib/hooks/use-mounted.ts` (useSyncExternalStore-based).
- Removed the `resolvedTheme ?? "dark"` pattern everywhere it appeared in SSR'd components. Each parent now exposes `theme: "dark" | "light" | null` — null until mounted. Children render a 14×14 / 15×15 invisible placeholder and a neutral "Toggle theme" aria-label until theme resolves on the client. `suppressHydrationWarning` is set on the affected buttons as a defence-in-depth.
- `SettingsPanel` is intentionally NOT patched: it never SSRs because it's gated on `settingsOpen && <SettingsPanel />`.

**Brief client loading skeleton** (`src/app/brief/[shareToken]/loading.tsx`, new)

- Layout-isomorphic skeleton matching the real `ClientHeader` + `ClientDoc` geometry: 48px header strip with brand / doc meta / two icon buttons / submit button, then a centered `max-w-[920px]` column with title, mono meta row, section dividers, and requirement-card bones (status pill + tags + body lines). Static bones with a single subtle `animate-pulse` — same `Bone` helper signature as `/app/loading.tsx`. Deliberately avoids the root `loading.tsx` style (pulse ring, shimmer bar, blinking cursor, logo splash).

### Session 4 — real app shell data + source wiring

**Internal workspace page** (`src/app/app/page.tsx`)

- `/app` now loads real projects for the signed-in user.
- The page ensures a workspace exists with `ensureWorkspaceForUser(clerkUserId)`.
- The active project is chosen from `?projectId=` or falls back to the first available project.
- The earliest `IntakeSession` for the active project is loaded server-side.
- The session's current source assets are loaded server-side and passed into `EditorShell` as `initialSources`.

**Editor shell wiring** (`src/components/editor/editor-shell.tsx`)

- `EditorShell` now accepts `projects`, `activeProjectId`, `session`, and `initialSources`.
- `appState` is derived honestly from real data: `no-session`, `no-sources`, or `ready`.
- The shell maintains a per-project client cache of session + source data.
- Soft project switching is implemented from cached `/api/projects` data, with URL replacement when possible.
- `RightPane` is wired to real source data and source mutations.
- File upload works through `useUploadThing("mixedUploader")`.
- The paperclip in `DocView` and the Sources-tab upload button share the same upload path.

**Project sidebar** (`src/components/editor/project-sidebar.tsx`)

- The sidebar is no longer a permanent empty state.
- It renders real projects with active highlighting and relative timestamps.
- "New project" is wired through the real `createProjectAction` server action.

**Source management UI** (`src/components/editor/right-pane.tsx`, `src/components/editor/doc-view.tsx`)

- Source list rendering is live.
- Pasted text submission is live.
- Rename is live with optimistic UI.
- Delete is live with optimistic UI and a 409-aware error message for undeletable processed assets.
- Source loading, upload, and retry states are surfaced through `RightPane`.

### Design system

- Theme is provided by `next-themes` via `ThemeProvider` in `src/components/providers.tsx` (`attribute="data-theme"`, `storageKey="rx-theme"`, `defaultTheme="system"`). The legacy `src/lib/hooks/use-theme.ts` was removed — use `useTheme()` from `next-themes` directly.
- `src/lib/hooks/use-mounted.ts` — `useSyncExternalStore`-based mount detector. Required when rendering theme-dependent UI in any SSR'd component, because `useTheme().resolvedTheme` is `undefined` on the server. Pattern: derive `theme: "dark" | "light" | null` (null until mounted) and render a stable placeholder for the null case.
- `src/components/theme-toggle.tsx` — reusable `<ThemeToggle />` client component (Sun/Moon button); used on the landing page. Already uses the `useMounted` pattern.
- `src/app/globals.css` — `touch-action: manipulation` on all buttons; `prefers-reduced-motion` media query
- `src/app/layout.tsx` — `colorScheme: "dark"` on `<html>`; `<meta name="theme-color" content="#141517">`; mounts the `<div id="clerk-captcha" />` placeholder for Clerk Smart CAPTCHA.
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
- No longer hardcodes `appState="no-session"` or `sessionName={null}`; both are now derived from real loaded session/source data
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
- the app shell is session-aware and project-aware
- the sidebar renders real projects and supports creating new ones
- `RightPane` Sources tab is visually complete and wired to real source APIs
- pasted text, upload, rename, delete, retry, and refresh flows are implemented
- `DocView` has an honest state machine derived from real session/source presence
- the central document body is still placeholder content rather than real snapshot-backed brief data
- nothing is wired to the generate API yet

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

- `GET /api/projects`
- `GET /api/sessions/[sessionId]/assets`
- `POST /api/sessions/[sessionId]/assets`
- `PATCH /api/assets/[assetId]`
- `DELETE /api/assets/[assetId]`

Use these for:

- project/session/source bootstrap
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

### 1. Generate/regenerate action wiring

Files to evolve:

- `src/components/editor/doc-view.tsx`
- `src/components/editor/editor-shell.tsx`
- `src/components/editor/statusbar.tsx`

What is missing:

- "Generate Brief" button exists and has the correct disabled states — but `onClick` does nothing yet
- needs to call `POST /api/generate` with the active `sessionId`
- status bar `extractStatus` prop is effectively idle-only today
- command palette generate action is visual only

Expected UX:

- on click: set `appState="generating"` immediately, call API
- API response confirms job is queued: set `extractStatus="queued"` in status bar
- poll or listen for job completion; update `extractStatus` accordingly
- if the pipeline fails (currently always will with `PIPELINE_NOT_IMPLEMENTED`): set `appState="failed"` and `extractStatus="failed"`
- do not fake success

### 2. Wire public comment submission

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

### 3. Wire follow-up answer submission

Files to evolve:

- `src/components/brief/question-block.tsx`

What is missing:

- `QuestionBlock` calls `onSubmitAnswer(text)` — only updates local state
- needs to POST to `/api/public/briefs/[shareToken]/answers`

Expected behavior:

- submit is async: show pending in the button
- on success, show confirmed answer state
- on failure, show inline error

### 4. Wire brief confirmation

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

### 5. Internal snapshot-backed brief renderer

Files to evolve:

- `src/components/editor/doc-view.tsx`

Current state:

- `DocView` has the state machine, CTA behavior, and surrounding shell behavior needed for the internal workspace
- the content it renders when "ready" is still placeholder line-based brief content

What should eventually happen:

- replace placeholder content with real `BriefSnapshot` / `BriefClaim` / `BriefQuestion` / `EvidenceRef` data
- render the brief's summary, goals, ambiguities, and follow-up questions as sections
- support evidence affordances and selection targets

Blocked by:

- no successful snapshot generation path yet
- no snapshot query/read model exposed to the UI yet

Claude guidance:

- when the snapshot API is ready, refactor `DocView` to accept snapshot-shaped props directly
- do not keep doubling down on the current line-based mock format

### 6. Revision timeline backed by real events

Files to evolve:

- `src/components/editor/right-pane.tsx`

What should eventually happen:

- `RevisionsTab` currently shows an empty state
- should show persisted revision events for generation, regeneration, comments, answers, and confirmation

Blocked by:

- no UI data loader for revision events yet

### 7. Internal feedback visibility

Files to evolve:

- `src/components/editor/right-pane.tsx`
- `src/components/editor/doc-view.tsx`

What should eventually happen:

- internal users should see public comments and follow-up answers inside the workspace

Blocked by:

- no read-side feedback query surface wired into the app yet

### 8. Public brief page with real snapshot data

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

1. **Generate action** — wire the "Generate Brief" button to `POST /api/generate`. Show queued/running/failed status honestly.
2. **Public mutations** — wire comment, answer, and confirm POSTs on the brief page. These are self-contained and do not depend on session context.
3. **Snapshot renderer** — refactor `DocView` to accept real `BriefSnapshot` shape when the generation pipeline is working.
4. **Public snapshot data** — replace `MOCK_REQUIREMENTS` and `MOCK_REVISIONS` with real data once the share-link read path is implemented.

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
