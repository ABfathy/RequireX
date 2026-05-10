# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # prisma generate + next build --webpack
pnpm lint             # ESLint (zero warnings enforced)
pnpm typecheck        # tsc --noEmit
pnpm format           # Prettier write
pnpm format:check     # Prettier check

pnpm prisma:migrate   # Run migrations
pnpm prisma:generate  # Regenerate Prisma client
pnpm prisma:seed      # Seed database
pnpm prisma:studio    # Open Prisma Studio
```

Package manager: **pnpm 10.22.0**. Never use npm or yarn.

## Architecture

**RequireX** — AI-powered intake and project-brief generation system. Full-stack TypeScript; no Python.

### Route Layout

| Route | Surface |
|---|---|
| `/` | Public landing page |
| `/app/**` | Protected internal workspace (Clerk-gated) |
| `/brief/[shareToken]` | Public client-facing brief review |
| `/sign-in`, `/sign-up` | Clerk auth pages |

### Key Directory Structure

```
src/
├── app/                 # Next.js App Router pages & layouts
├── components/ui/       # shadcn/ui components (CVA-based)
├── lib/
│   ├── env/             # Zod-validated env (client.ts, server.ts) — import from here, not process.env
│   ├── prisma.ts        # Prisma singleton — use this, not prisma-client.ts directly
│   └── utils.ts         # cn() helper (clsx + tailwind-merge)
└── server/
    ├── actions/         # Server actions
    ├── auth/            # requireInternalAuth(), requireInternalActor()
    ├── services/        # Business logic
    └── validators/      # Zod schemas + persistence checks

prisma/
├── schema.prisma        # Source of truth for data model
└── seed.ts              # Seed script
```

### Auth

Clerk handles auth. Middleware in `src/proxy.ts` protects `/app/**` via `auth.protect()`. Server-side guards:

- `requireInternalAuth()` → `{clerkUserId, clerkSessionId}`
- `requireInternalActor()` → full actor with email, name, imageUrl
- Throws `InternalAuthorizationError` (401) if unauthenticated

Always use these helpers in server actions/API routes — never trust client-passed user IDs.

### Data Model (Prisma + PostgreSQL)

Core flow: `Workspace → Project → IntakeSession → SourceAsset → SourceChunk → BriefSnapshot → BriefClaim/BriefQuestion → EvidenceRef`

Key enums: `IntakeSession` status: `DRAFT→COLLECTING→PROCESSING→REVIEW_READY`. `BriefSnapshot` status: `DRAFT/SHARED/CONFIRMED/SUPERSEDED`. `ProcessingJob` status: `QUEUED→RUNNING→SUCCEEDED/FAILED`.

`ShareLink` model stores the token used in `/brief/[shareToken]`.

### Environment

Never access `process.env` directly. Import from:
- `src/lib/env/server.ts` — server-side secrets (DATABASE_URL, CLERK_SECRET_KEY, UPLOADTHING_TOKEN, GCP, Inngest)
- `src/lib/env/client.ts` — public vars (NEXT_PUBLIC_*)

Copy `env.example` → `.env.local` to set up. Minimum needed locally: `DATABASE_URL`, Clerk keys.

`SEED_USER_ID` — set to your Clerk user ID (`user_2...`) before running `pnpm prisma:seed` so seed data is owned by your account and the editor loads a real session. Find it in the Clerk dashboard or via `window.Clerk.user.id` in the browser console.

### Intake API (Workstream 4)

UploadThing router at `src/lib/uploadthing.ts` — 4 routes:

| Route | Types | Max size | Max files |
|---|---|---|---|
| `imageUploader` | image/jpeg png webp gif tiff | 8 MB | 10 |
| `audioUploader` | audio/mpeg mp4 wav webm ogg x-m4a | 100 MB | 1 |
| `pdfUploader` | application/pdf | 32 MB | 5 |
| `mixedUploader` | all above combined | per-type | 10 |

UploadThing v7 has no `audio` category — `audioUploader` and `mixedUploader` use `blob` type. MIME guard in `onUploadComplete` rejects non-audio. WS6 must set `accept="audio/*"` on the file input.

REST API surface:
- `GET /api/sessions/[sessionId]/assets` — list assets with status
- `POST /api/sessions/[sessionId]/assets` — create text asset `{ textContent, displayLabel? }`
- `DELETE /api/assets/[assetId]` — remove asset (only when status is UPLOADED or FAILED)
- `PATCH /api/assets/[assetId]` — rename `{ displayLabel }`
- `GET/POST /api/uploadthing` — UploadThing handler (client SDK target)

**Asset status ownership:** WS4 only writes `UPLOADED`. WS5 (Inngest jobs) transitions `QUEUED → PROCESSING → PROCESSED/FAILED`. Never skip states. Text assets (pasted content) bypass UploadThing and go directly to Postgres with `sourceType: TEXT`.

Service layer: `src/server/services/assets.ts` — `persistFileAsset`, `persistTextAsset`, `getSessionAssets`, `deleteAsset`, `updateAssetLabel`.

Validators: `src/server/validators/assets.ts` — `detectSourceType(mimeType)`, `TextAssetInputSchema`, `UpdateLabelInputSchema`, `TEXT_MAX_CHARS` (500 000).

Unit tests in `tests/unit/` — not yet wired to Vitest runner (Workstream 10).

### Editor State Machine

`AppState` (defined in `src/components/editor/doc-view.tsx`): `no-session → no-sources → generating → failed → ready`.

`src/app/app/page.tsx` is an async server component — it queries `prisma.intakeSession.findFirst` by `clerkUserId` and passes `{ id, title } | null` to `EditorShell`. `EditorShell` derives `appState` from the presence of the session prop and threads `sessionName` (title) to `DocView`/`StatusBar` and `sessionId` (id) to `RightPane`.

### Images

`next.config.ts` allows `img.clerk.com` as a remote pattern for `next/image` (required for the settings panel avatar).

### Planned Integrations (not yet wired)

- **Inngest** — async job processing (env vars exist, SDK not imported)
- **Google Cloud Vertex AI** — brief generation (env vars exist, SDK not imported)

Tests not yet configured (placeholders exist for unit, e2e, a11y — Workstream 10).
