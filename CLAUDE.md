# CLAUDE.md

This repository is a TypeScript-only Next.js app for AI-assisted intake and brief generation.

## Commands

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

`pnpm test` and `pnpm test:unit` run the current Vitest suite. `pnpm test:e2e` and `pnpm test:a11y` are still placeholders.

## High-Level Architecture

- `/` is the landing page
- `/app/**` is the protected internal workspace
- `/brief/[shareToken]` is the public review route
- `/api/generate` and `/api/regenerate` queue jobs, but no generation pipeline exists yet

Core relation chain:

`Workspace -> Project -> IntakeSession -> SourceAsset -> SourceChunk`

Generated-output chain:

`IntakeSession -> BriefSnapshot -> BriefClaim / BriefQuestion -> EvidenceRef`

## Current Implementation Status

Implemented:

- Clerk auth and custom auth pages
- per-user workspace bootstrap
- project listing and project creation
- source asset listing, creation, upload, rename, and delete
- UploadThing route handlers
- public review mutations and tests
- Inngest event dispatch for generation requests

Not implemented:

- source processing pipeline
- live brief snapshot generation
- live brief rendering in the internal editor
- live brief rendering on the public review page
- share-link creation UI
- e2e and accessibility automation

## Auth Rules

- Use `requireInternalAuth()` or `requireInternalActor()` on internal server entry points.
- Never trust a client-supplied user ID.
- Signed-in users hitting `/sign-in` or `/sign-up` are redirected away by middleware.

## Environment

- Use `src/lib/env/server.ts` and `src/lib/env/client.ts`.
- Do not read `process.env` directly in app code.
- `SEED_USER_ID` must be set before `pnpm prisma:seed` if you want seeded rows tied to your Clerk user.

## Source Ingestion

- Text sources are created through `POST /api/sessions/[sessionId]/assets`.
- File uploads go through UploadThing and persist `SourceAsset` rows on upload completion.
- Delete is only allowed for `UPLOADED` and `FAILED` assets.

## Testing

- `pnpm test` runs the current Vitest suite.
- Existing tests focus on validators, asset services, public auth, public review services, and public review routes.
