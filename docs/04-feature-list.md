# Feature List

## Implemented

### Auth & Workspace
- Internal auth flow with custom Clerk sign-in / sign-up pages
- Middleware-enforced route protection; signed-in users redirected away from auth pages
- Automatic workspace bootstrap per Clerk user on first load

### Projects & Sessions
- Project list loading and active-project switching via `?projectId=`
- New project creation with automatic initial intake session
- Project search palette (⌘P)

### Sources
- Source listing for the active session
- Pasted-text source creation (`POST /api/sessions/[sessionId]/assets`)
- File uploads for image, PDF, and audio via UploadThing
- Source rename and delete (restricted to `UPLOADED` and `FAILED` status)
- Client-side optimistic updates, retry, and loading states

### Brief Generation
- Sync Vertex AI generation via `@google/genai` (Gemini 2.5 Flash) — default path
- Async generation via Inngest (`BRIEF_GENERATION_ASYNC=1` flag)
- PDF sources: downloaded, parsed to text, chunked into `SourceChunk` rows
- Audio sources: downloaded, transcribed to English via Gemini, chunked
- Image sources: passed directly to Gemini vision API
- Source bundle allocation with even per-source budget
- Streaming SSE response with character-by-character animation in the editor
- Unified generate / regenerate button — shows "Generate Brief" before the first snapshot, switches to "Regenerate" (refresh icon) once one exists; both call the same `/api/generate` pipeline
- `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, `EvidenceRef` persistence on success
- `GENERATED` revision event created per run

### AI Revision (Chat)
- `/api/revise` accepts a user message and optional selection
- Streaming revision response renders incrementally in the editor
- `REGENERATED` revision event created per revision
- Inline editing and revision navigation

### Internal Editor
- Latest `BriefSnapshot` rendered as `DocLineData[]` in the document view
- Source preview modal
- Resizable sidebar and right pane with persistent widths
- Right pane — **Sources tab**: list, upload, add pasted text, rename, delete, preview
- Right pane — **Revisions tab**: full revision history from `RevisionEvent`, coloured by type, enriched with public feedback bodies and authors
- Right pane — **Chat tab**: displays chat revision messages (send action not yet wired)

### Public Review (Backend)
- Comment submission route and service with `BriefComment` persistence
- Follow-up answer route and service with `FollowUpAnswer` persistence
- Confirmation route and service — marks snapshot `CONFIRMED`
- Share-link validation (token, expiry, status)
- Snapshot mutability guard (only `SHARED` snapshots accept mutations)
- In-memory rate limiting by action + share token + IP
- `RevisionEvent` created for every public mutation

### Public Review (UI)
- `/brief/[shareToken]` — responsive public review shell with themed header
- Comment threads wired to `POST /api/public/briefs/[shareToken]/comments`
- Follow-up answers wired to `POST /api/public/briefs/[shareToken]/answers`
- Confirmation flow wired to `POST /api/public/briefs/[shareToken]/confirm`
- Error mapping from API status codes to user-facing messages

### Testing
- 11 Vitest unit test files, 93 tests — all passing
- Coverage: validators, asset services, brief pipeline, PDF extraction, source processing, public auth, public review services and routes

---

## Partial / Not Fully Wired

- **Public brief data** — `/brief/[shareToken]` shell and submission wired, but renders `MOCK_REQUIREMENTS` instead of querying the real `BriefSnapshot`; snapshot-to-page binding is missing
- **Revision diff** — revision list renders in the right pane; clicking a past version loads it read-only, but no side-by-side diff view
- **Chat send** — chat tab displays revision messages; the send-message input field exists but the "new conversation" initiation from the tab is not yet triggered from a standalone input (only from document selection)
- **Async job status UI** — generation job status (queued / running / failed) is not surfaced beyond the generating spinner

---

## Not Started

- **Share-link creation** — `ShareLink` model exists; public mutations read it; but no API endpoint, no service function, and no UI button to create one
- **E2E tests** — `pnpm test:e2e` is a placeholder script
- **Accessibility automation** — `pnpm test:a11y` is a placeholder script
