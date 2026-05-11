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

**Clerk appearance:** `ClerkProvider` lives in `src/components/providers.tsx` (themed via `next-themes`), not `layout.tsx`. Uses `variables` only — `elements` with inline style objects are silently dropped in Clerk v7. Custom sign-in/sign-up pages use the `[[...sign-in]]` catch-all route with the `<SignIn>` / `<SignUp>` components.

**Clerk routing centralization:** `<ClerkProvider>` receives `signInUrl`, `signUpUrl`, `signInFallbackRedirectUrl`, `signUpFallbackRedirectUrl` from `clientEnv`. Do not re-add per-button `forceRedirectUrl="/app"` on `<SignInButton>` / `<SignUpButton>` — they're redundant. Without provider-level URLs, `<SignUp>`'s internal "Already have an account?" link falls back to Clerk's hosted `accounts.*.clerk.accounts.dev` domain.

**Sign-in / sign-up pages:** `src/app/sign-in/[[...sign-in]]/page.tsx` and `src/app/sign-up/[[...sign-up]]/page.tsx` are client components. They watch `useAuth().isSignedIn` and call `router.replace("/app")` on success — this removes the auth route from browser history, so Back from `/app` does not land on a stale form. Rendering a `<Spinner />` placeholder during the transition prevents a blank frame before `/app/loading.tsx`.

**OAuth SSO callbacks:** Dedicated pages at `src/app/sign-in/sso-callback/page.tsx` and `src/app/sign-up/sso-callback/page.tsx` are client components that render a visible spinner alongside `<AuthenticateWithRedirectCallback signInForceRedirectUrl="/app" signUpForceRedirectUrl="/app" />` and also call `router.replace("/app")` on `isSignedIn`. The `<div id="clerk-captcha" />` mount point lives in `src/app/layout.tsx`, not the callback pages. Do NOT rely on the `[[...sign-in]]` catch-all for SSO callbacks — it gets stuck.

**Middleware (`src/proxy.ts`):** Signed-in users hitting `/sign-in` or `/sign-up` are redirected to `/` (landing), not `/app`. This is the safety net for manual URL entry; the back-button case is handled by `router.replace` on the auth pages themselves.

**ClerkModalGuard** (`src/components/clerk-modal-guard.tsx`) — closes all Clerk modals on route change. Mounted inside `ClerkProvider` in `layout.tsx`.

### Data Model (Prisma + PostgreSQL)

Core flow: `Workspace → Project → IntakeSession → SourceAsset → SourceChunk → BriefSnapshot → BriefClaim/BriefQuestion → EvidenceRef`

Key enums: `IntakeSession` status: `DRAFT→COLLECTING→PROCESSING→REVIEW_READY`. `BriefSnapshot` status: `DRAFT/SHARED/CONFIRMED/SUPERSEDED`. `ProcessingJob` status: `QUEUED→RUNNING→SUCCEEDED/FAILED`.

`ShareLink` model stores the token used in `/brief/[shareToken]`.

### Environment

Never access `process.env` directly. Import from:
- `src/lib/env/server.ts` — server-side secrets (DATABASE_URL, CLERK_SECRET_KEY, UPLOADTHING_TOKEN, GCP, Inngest)
- `src/lib/env/client.ts` — public vars (NEXT_PUBLIC_*)

Copy `env.example` → `.env.local` to set up. Minimum needed locally: `DATABASE_URL`, Clerk publishable + secret keys, and the four **required** Clerk routing vars enforced by the client env schema:

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app`

These are validated at import-time in `src/lib/env/client.ts` — missing any one will crash app startup with a zod error. They're consumed by `<ClerkProvider>` in `src/components/providers.tsx`.

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

### Theme

`next-themes` provides theming via `ThemeProvider` in `src/components/providers.tsx` (`attribute="data-theme"`, `storageKey="rx-theme"`, `defaultTheme="system"`).

**Hydration footgun:** `useTheme().resolvedTheme` is `undefined` on the server. The pattern `resolvedTheme ?? "dark"` SSRs as `"dark"` but the client may resolve to `"light"` → React throws a hydration mismatch and regenerates the subtree. In any component that SSRs and renders theme-dependent UI (icons, aria-labels, etc.), gate the output on `useMounted()` from `src/lib/hooks/use-mounted.ts` (a `useSyncExternalStore`-based hook — the standard `useEffect + setMounted` pattern fails the repo's `react-hooks/set-state-in-effect` rule). Render a stable placeholder until mounted. Post-interaction components (e.g. `SettingsPanel` opened via a click) don't need this since they never SSR.

### Images

`next.config.ts` allows `img.clerk.com` as a remote pattern for `next/image` (required for the settings panel avatar).

### Planned Integrations (not yet wired)

- **Inngest** — async job processing (env vars exist, SDK not imported)
- **Google Cloud Vertex AI** — brief generation (env vars exist, SDK not imported)

Tests not yet configured (placeholders exist for unit, e2e, a11y — Workstream 10).
