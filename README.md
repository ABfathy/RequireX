# RequireX

Desktop-first AI intake and project-brief generation for the Softworks x AISprint hackathon.

This repository currently contains the planning and architecture package for the 7-day build. The product goal is to take messy client inputs like text, audio, screenshots, and PDFs, then generate a clean, structured project brief with evidence-backed citations and a shareable client review link.

## Core Idea

The app is an intake and structuring layer, not a project management tool.

Internal users should be able to:

- Create projects and intake sessions
- Work within one client per project
- Upload raw client material
- Upload files one by one or as one mixed-source folder
- Generate a structured brief with AI
- Inspect claim-level evidence references
- Refine selected sections through AI-assisted editing
- Share a public link with clients
- Review client comments and answers
- Regenerate the brief into a new version

Clients should be able to:

- Open a share link with minimal friction
- Read the brief cleanly on desktop or mobile
- Add inline comments to highlighted sections or targeted brief areas
- Answer follow-up questions through structured inputs
- Confirm the brief

## Planned Stack

- `Next.js` App Router on `Vercel`
- `Tailwind CSS` with a desktop-first responsive layout
- `Clerk` for internal auth
- `Supabase Postgres + Storage`
- `Prisma` for schema and migrations
- `Inngest` for async jobs and retries
- `@google/genai` on `Vertex AI`
- `Vitest` + `React Testing Library` for unit and component tests
- `Playwright` + `axe-core` for e2e, responsive, and accessibility testing

Optional later addition:

- `Vercel AI SDK` only for a more chat-like internal refinement UX if needed

## Why TypeScript-Only in V1

Python is intentionally not part of the initial architecture.

The hackathon problem is primarily orchestration, normalization, storage, AI prompting, validation, and UI workflow. Those all fit cleanly in a single TypeScript stack. A Python worker would only be introduced later if extraction quality, OCR layout fidelity, or audio preprocessing becomes a measurable bottleneck.

We are also treating `@google/genai` as the primary AI SDK. The `Vercel AI SDK` may still be useful later for refinement-chat UX, but not as the main brief-generation layer.

## Docs

Start here:

- [docs/README.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/README.md)
- [hackathon-softworks-extracted.md](/Users/abdallah/repos/EUI-hackathon-2026/hackathon-softworks-extracted.md)

Detailed planning:

- [docs/01-tech-stack.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/01-tech-stack.md)
- [docs/02-system-architecture.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/02-system-architecture.md)
- [docs/03-brief-contract.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/03-brief-contract.md)
- [docs/04-feature-list.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/04-feature-list.md)
- [docs/05-task-list.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/05-task-list.md)
- [docs/06-roadmap.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/06-roadmap.md)
- [docs/07-novelties.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/07-novelties.md)
- [docs/08-testing-strategy.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/08-testing-strategy.md)
- [docs/09-current-state.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/09-current-state.md)
- [docs/10-current-plan.md](/Users/abdallah/repos/EUI-hackathon-2026/docs/10-current-plan.md)

## Planned Repo Scripts

These are the scripts the implementation should expose once the app scaffold is added:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm test:a11y
pnpm prisma:migrate
pnpm prisma:studio
```

## Testing Expectations

Unit and component coverage should focus on:

- brief contract validation
- evidence mapping
- upload and normalization helpers
- route/service logic
- major UI components

End-to-end coverage should focus on:

- authenticated internal workflow on desktop
- public review flow without auth
- responsive mobile support
- comment and answer submission
- regeneration flow
- accessibility checks on critical routes

## UX Direction

The app is desktop-first for internal users.

Layout target:

- left rail for projects and sessions
- center for the brief artifact
- bottom composer for AI refinements
- right panel for chat history, source assets, revisions, and feedback

Mobile support remains important, especially for public client review, but mobile should not weaken the main desktop authoring workflow.

## Scope Clarifications from Softworks

- one project always has one client and one source of truth
- multiple chats or intake sessions can exist inside the same project
- client review should be a brief-first page with inline comments, not a public chat UI
- `n8n` and third-party intake automation are out of core scope for the hackathon
- a landing page is optional polish, not a required deliverable
- a lightweight access gate before viewing the client brief is a bonus, not a core requirement

## UI Novelty Constraints

Novelty is allowed only when it helps the demo without hurting readability or performance.

- `react-bits` should stay mostly on landing, empty states, and controlled decorative areas
- `animejs` should be used for short, meaningful transitions
- `web-haptics` should enhance mobile confirmations and submissions only
- all non-essential motion should respect reduced-motion preferences

Note: `react-bits` currently advertises `MIT + Commons Clause`, so the team should keep usage deliberate and document the dependency clearly.

## Reference Links

- [Next.js docs](https://context7.com/vercel/next.js)
- [Clerk docs](https://context7.com/clerk/clerk-docs)
- [Google Gen AI JS SDK docs](https://context7.com/websites/googleapis_github_io_js-genai)
- [Playwright docs](https://context7.com/microsoft/playwright)
- [Vitest docs](https://context7.com/vitest-dev/vitest)
- [React Testing Library docs](https://context7.com/testing-library/react-testing-library)
- [web-haptics](https://github.com/lochie/web-haptics)
- [react-bits](https://github.com/DavidHDev/react-bits)
- [animejs](https://github.com/juliangarnier/anime)
