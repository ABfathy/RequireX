# Tech Stack

## In Use

- `Next.js 16` App Router
- `React 19`
- `Tailwind CSS 4`
- `Clerk` for internal auth
- `Prisma 7` for schema, queries, and migrations
- `PostgreSQL` as the primary datastore
- `UploadThing` for file uploads
- `Inngest` for async job dispatch and function definitions
- `Vitest` for unit/service/route coverage
- `Zod` for env and request validation

## Partially Wired

- `Inngest` is used only for PDF/audio source preprocessing. Brief generation itself runs in the Next.js server.
- `UploadThing` is live for source ingestion, and uploaded PDF/audio sources can be preprocessed before prompt assembly.

## Not Yet Present

- No AI SDK is currently installed or imported for extraction/generation.
- No Playwright setup is present.
- No accessibility automation is present.
- No background worker outside Inngest is present.

## Notes

- This remains a TypeScript-only codebase.
- `pnpm` is the package manager. `packageManager` is pinned to `pnpm@10.22.0`.
- Environment access is centralized through `src/lib/env/server.ts` and `src/lib/env/client.ts`.
