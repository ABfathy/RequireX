# WS5 Local Development Runbook

This guide is for running the Workstream 5 flow locally without Docker. It covers the Next.js app, Supabase Postgres, Prisma, Clerk, UploadThing, and the local Inngest Dev Server.

## Prerequisites

- Node.js 20 or newer
- `pnpm 10.22.0`
- A Supabase Postgres connection string
- Clerk development app keys
- UploadThing token if testing file uploads
- Google Cloud / Vertex AI credentials when testing real AI generation

Use `pnpm` for every project command. Do not use `npm` or `yarn`.

## Environment Setup

Create your local env file:

```bash
cp env.example .env.local
```

Fill these values:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://...
UPLOADTHING_TOKEN=...

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_LOCATION=...
GOOGLE_APPLICATION_CREDENTIALS=...

INNGEST_DEV=1
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

SEED_USER_ID=user_...
```

Notes:

- `DATABASE_URL` should point to Supabase Postgres.
- `SEED_USER_ID` must be your Clerk user ID so seeded demo data belongs to your account.
- `INNGEST_DEV=1` makes the Inngest SDK talk to the local Dev Server.
- Google/Vertex values are required only when running the real model call.

## Install And Prepare Database

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

Optional database browser:

```bash
pnpm prisma:studio
```

## Run The App Locally

Terminal 1:

```bash
pnpm dev
```

Open:

- App: `http://localhost:3000`
- Internal workspace: `http://localhost:3000/app`

## Run Inngest Locally

Terminal 2:

```bash
npx --ignore-scripts=false inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open the Inngest Dev Server:

```bash
http://localhost:8288
```

The app exposes functions at:

```bash
http://localhost:3000/api/inngest
```

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

Current testing note:

- `pnpm test` runs Vitest unit tests.
- `pnpm test:unit`, `pnpm test:e2e`, and `pnpm test:a11y` are placeholder scripts.

## Current WS5 Behavior

- Pasted text is stored directly in Postgres as `SourceAsset` rows.
- PDF and voice files are stored through UploadThing as source assets.
- The WS5 generation pipeline is text-first: it uses persisted text assets, creates source chunks, calls Vertex AI through `@google/genai`, validates the brief contract, and persists a snapshot.
- Uploaded PDF and voice assets are intentionally not interpreted yet. They remain stored for future extraction/transcription work.
