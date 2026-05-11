
```text
██████╗ ███████╗ ██████╗ ██╗   ██╗██╗██████╗ ███████╗██╗  ██╗
██╔══██╗██╔════╝██╔═══██╗██║   ██║██║██╔══██╗██╔════╝╚██╗██╔╝
██████╔╝█████╗  ██║   ██║██║   ██║██║██████╔╝█████╗   ╚███╔╝
██╔══██╗██╔══╝  ██║▄▄ ██║██║   ██║██║██╔══██╗██╔══╝   ██╔██╗
██║  ██║███████╗╚██████╔╝╚██████╔╝██║██║  ██║███████╗██╔╝ ██╗
╚═╝  ╚═╝╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
```

AI intake and brief-generation workspace for the Softworks x AISprint hackathon.

## Repo state

This repo is no longer just a planning scaffold. It now includes a working internal workspace with auth, per-user workspace/project bootstrapping, source ingestion, UploadThing-backed file uploads, public review mutation APIs, Prisma persistence, and Inngest job request wiring.

The generation pipeline itself is still not implemented. `POST /api/generate` and `POST /api/regenerate` create `ProcessingJob` records and dispatch Inngest events, but the current Inngest functions intentionally mark those jobs as failed with `PIPELINE_NOT_IMPLEMENTED`.

The public client brief route also still renders mock data today, even though the supporting public review APIs and database models exist.

## Current Capabilities

- Internal auth with Clerk on `/app/**`
- Automatic per-user workspace creation
- Project list, project switching, and project creation
- One initial intake session created per new project
- Source ingestion via pasted text and uploaded files
- UploadThing routes for images, PDFs, audio, and mixed uploads
- Source rename and delete flows
- Public review APIs for comments, follow-up answers, and confirmation
- Prisma schema and migration for the full core data model
- Vitest coverage for asset services, public auth, public review services, validators, and public review routes

## Important Gaps

- No implemented AI extraction or brief generation pipeline yet
- No live brief snapshot rendering in the internal editor
- No live snapshot-backed rendering on `/brief/[shareToken]`
- No share-link creation UI yet
- No e2e or accessibility automation despite placeholder scripts

## Stack

- `Next.js 16` App Router
- `React 19`
- `Tailwind CSS 4`
- `Clerk`
- `Prisma`
- `PostgreSQL`
- `UploadThing`
- `Inngest`
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

Note: `pnpm test` and `pnpm test:unit` both run the current Vitest suite. `pnpm test:e2e` and `pnpm test:a11y` are still placeholders.

## Docs

Start with [docs/README.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/README.md).

Most useful docs:

- [docs/09-current-state.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/09-current-state.md)
- [docs/05-task-list.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/05-task-list.md)
- [docs/11-next-steps.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/11-next-steps.md)
- [claude-curr-sesh.md](/Users/abdallah/repos/EUI-hackathon-2026/claude-curr-sesh.md)

Reference docs:

- [docs/01-tech-stack.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/01-tech-stack.md)
- [docs/02-system-architecture.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/02-system-architecture.md)
- [docs/03-brief-contract.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/03-brief-contract.md)
- [docs/04-feature-list.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/04-feature-list.md)
- [docs/08-testing-strategy.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/08-testing-strategy.md)

Original hackathon reference material:

- [docs/hackathon-softworks-extracted.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/hackathon-softworks-extracted.md)
- [docs/hackathon-softworks.pdf](/Users/abdallah/repos/EUI-hackathon-2026/docs/hackathon-softworks.pdf)
