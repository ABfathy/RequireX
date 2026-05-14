```text
██████╗ ███████╗ ██████╗ ██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██╔══██╗██╔════╝██╔═══██╗██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝
██████╔╝█████╗  ██║   ██║██║   ██║██║██████╔╝█████╗   ╚███╔╝
██╔══██╗██╔══╝  ██║▄▄ ██║██║   ██║██║██╔══██╗██╔══╝   ██╔██╗
██║  ██║███████╗╚██████╔╝╚██████╔╝██║██║  ██║███████╗██╔╝ ██╗
╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

AI intake and brief-generation workspace for the EUI Hackathon 2026.

## What It Does

RequireX ingests PDFs, voice notes, screenshots, and pasted text from a client engagement, runs the full content through Gemini 2.5 Flash, and produces a structured requirements brief with traceable evidence back to every source. The brief is then shared with the client via a unique link — they can comment on individual requirements, answer clarification questions, and confirm approval, all without a login.

## Current State

The full product loop is implemented end-to-end:

**Internal workspace:**
- Clerk auth with custom sign-in / sign-up pages; `/app/**` protected by middleware
- Per-user workspace bootstrap; project creation and switching
- Source panel: pasted text, PDF upload, audio upload, image upload — rename, delete, preview
- Brief generation: unified "Generate Brief" / "Regenerate" button; sync pipeline (default) streams tokens to the editor via SSE with character-by-character animation; async Inngest path available via `BRIEF_GENERATION_ASYNC=1`
- Source processing: PDF parsed by built-in stream extractor, audio transcribed via Gemini, images passed as base64 vision input; all sources chunked into `SourceChunk` rows with evidence locators
- AI chat revision: select text in the brief or send a message from the chat tab — Gemini streams a revised brief, revision is persisted and navigable
- Revision history tab: full `RevisionEvent` timeline with client feedback bodies and authors shown inline
- Share-link creation: "Share" button in the doc header opens a modal, generates a cryptographically random token, sets snapshot status to `SHARED`, and shows the copy-able URL

**Public review:**
- `/brief/[shareToken]` loads the real `BriefSnapshot` from the database — claims, questions, comments, revision history, and diagrams
- Clients can comment on individual requirements, answer clarification questions, and confirm brief approval — all without a login
- Rate limiting per action + share token + IP; read-only guard once snapshot is `CONFIRMED`
- Every client action writes a `RevisionEvent` visible in the internal workspace

**Demo views (no login required):**
- Landing page → "Internal Workspace" → `/demo/workspace`
- Landing page → "Client Brief View" → `/demo/brief`

## Remaining Gaps

- Chat tab standalone send input not wired — chat messages currently only trigger from document text selection
- No e2e or accessibility automation (placeholder scripts only)

## Stack

- `Next.js 15` App Router
- `React 19`
- `Tailwind CSS 4`
- `Clerk`
- `Prisma`
- `PostgreSQL`
- `UploadThing`
- `Inngest` (async generation path)
- `@google/genai` — Gemini 2.5 Flash via Vertex AI
- `Vitest`

## Scripts

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

`pnpm test` and `pnpm test:unit` run the Vitest suite (11 files, 93 tests). `pnpm test:e2e` and `pnpm test:a11y` are placeholder scripts.

## Environment

Required for generation:
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_APPLICATION_CREDENTIALS` (path to ADC JSON)

Required for auth:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Required for file uploads:
- `UPLOADTHING_TOKEN`

Optional:
- `BRIEF_GENERATION_ASYNC=1` — switches `/api/generate` to Inngest dispatch (default `0`, sync)
- `SEED_USER_ID` — Clerk user ID to tie seeded rows to

## Docs

- [docs/09-current-state.md](docs/09-current-state.md) — detailed per-area status
- [docs/05-task-list.md](docs/05-task-list.md) — done / in-progress / next engineering work
- [docs/11-next-steps.md](docs/11-next-steps.md) — prioritised next steps
- [docs/02-system-architecture.md](docs/02-system-architecture.md) — data model and request flow
- [docs/03-brief-contract.md](docs/03-brief-contract.md) — Gemini output schema
- [docs/hackathon-softworks-extracted.md](docs/hackathon-softworks-extracted.md) — original brief
