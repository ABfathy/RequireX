# Tech Stack Choice

## Current Implementation Note

The stack choices in this file are still the intended direction, but the repo is at different levels of completion across them:

- `Next.js`, `Tailwind`, `Clerk`, `Prisma`, `UploadThing`, and `Inngest` are already wired in code
- the schema, migration, and seed path exist for the Postgres-backed data model, but production database verification is still pending
- `@google/genai` on `Vertex AI` remains the planned AI layer, but the real generation pipeline is not implemented yet
- `Vitest` is configured and already used for unit tests
- `React Testing Library`, `jest-dom`, `Playwright`, and automated accessibility coverage are still planned rather than integrated

## Chosen Stack

- Frontend and app server: `Next.js` App Router on `Vercel`
- Styling: `Tailwind CSS`
- Component system: `shadcn/ui`
- Internal auth: `Clerk`
- Relational database: `Supabase Postgres`
- File upload and storage: `UploadThing`
- ORM and migrations: `Prisma`
- Background jobs: `Inngest`
- AI inference: `@google/genai` using `Vertex AI`
- Unit and component testing: `Vitest`, `React Testing Library`, `@testing-library/jest-dom`
- E2E and responsive testing: `Playwright`
- Accessibility automation: `axe-core` in Playwright
- UI novelty: `react-bits`, `animejs`, `web-haptics`

## Why This Stack

### Next.js App Router

Use `Next.js` because the product needs:

- authenticated internal routes
- public share-link routes
- server route handlers
- file upload endpoints
- a single TypeScript codebase

This is the fastest path to shipping a real full-stack app in one week.

Reference:
- [Next.js docs](https://context7.com/vercel/next.js)

### Vercel

Use `Vercel` because the team wants:

- fast deployment
- minimal platform setup friction
- strong support for `Next.js`
- easy preview deployments during the hackathon

The tradeoff is that long-running work should not live in a normal request-response path. That is why async jobs are pushed into `Inngest`.

### Tailwind CSS

Use `Tailwind CSS` because the UI needs:

- fast iteration
- explicit responsive control
- strong desktop layout tuning
- tight implementation speed during a hackathon

The product is desktop-first for internal users, with mobile support for public review and light internal access.

### shadcn/ui

Use `shadcn/ui` as the main component baseline for the app shell.

Why:

- it is a strong fit for a modern desktop-first product UI
- it matches the clean, structured, Codex-like interface direction better than ad hoc component styling
- it gives the team accessible primitives for:
  - buttons
  - inputs
  - forms
  - sheets
  - dialogs
  - dropdowns
  - tabs
  - cards
- components live in the codebase directly, which makes design iteration easier during the hackathon

Design rule:

- use `shadcn/ui` for baseline product components
- use custom styling on top where needed to differentiate the workspace
- do not let decorative libraries replace the core app component layer

Reference:
- [shadcn/ui docs](https://context7.com/shadcn-ui/ui)

### Clerk

Use `Clerk` for internal auth only.

Why:

- the hackathon brief requires frictionless public access for clients
- `Clerk` can protect internal routes while leaving selected share-link routes public
- it avoids spending hackathon time building auth

Clients do not need accounts in v1.

Bonus path if time allows:

- add a lightweight access-code gate before the public brief page opens
- do not turn client review into a full account system

Reference:
- [Clerk docs](https://context7.com/clerk/clerk-docs)

### Supabase Postgres

Use `Supabase` for managed `Postgres` only.

Why:

- the team still gets a fast hosted relational database
- Prisma can own schema and migrations cleanly
- the app can avoid mixing file storage concerns into the database decision

We are not using Supabase Auth or Supabase Storage in v1.

### UploadThing

Use `UploadThing` as the only upload and file storage provider in v1.

Why:

- it gives the team a fast path for hosted file uploads
- it fits `Next.js` App Router well
- middleware can attach auth and upload metadata before storage
- `onUploadComplete` is the right handoff point for persisting `SourceAsset` rows in the database

Implementation rule:

- file-backed `SourceAsset` rows store UploadThing identifiers and URLs
- raw pasted text is still stored directly in Postgres as a first-class source item

### Prisma

Use `Prisma` for:

- clear schema definitions
- quick migrations
- team-friendly DX
- fast iteration during the hackathon

`Prisma` is preferred over `Drizzle` here because speed of onboarding and admin-side development matters more than lower-level SQL control.

### Inngest

Use `Inngest` for:

- durable async extraction jobs
- retries
- multi-step processing
- safe regeneration flows

This is important because PDF, image, and audio processing should not block user requests.

### Google Gen AI SDK on Vertex AI

Use `@google/genai` in `Vertex AI` mode because:

- the team constraint is to use GCP AI models
- the product needs multimodal handling
- the stack stays TypeScript-native

Default model assumption:

- `gemini-2.5-flash` for the main generation loop

Streaming note:

- the Google SDK already supports streaming output directly
- this is enough for incremental generation or staged UI updates if needed
- for this product, reliable multimodal generation and structured output matter more than chat-specific abstractions

Decision rule:

- use `@google/genai` as the default and primary AI SDK for all core workflows
- this includes ingestion, extraction, brief generation, and regeneration

Reference:
- [Google Gen AI JS SDK docs](https://context7.com/websites/googleapis_github_io_js-genai)

### Vercel AI SDK

Do not use the `Vercel AI SDK` as the primary AI layer in v1.

Why:

- the product’s main challenge is not generic chat streaming
- the core workflow is better modeled as async processing plus structured brief rendering
- the team already needs direct `Vertex AI` and Gemini support through Google’s SDK

Where it may still help later:

- internal refinement composer
- chat-like section editing
- richer streaming UI for internal assistant interactions
- easier client-side React chat state if the refinement surface becomes more conversational

Decision rule:

- use `Vercel AI SDK` only if the team later wants a more polished chat/refinement UI
- do not make it the source of truth for brief generation or contract persistence

Practical guidance:

- brief generation should usually feel like staged progress and structured section rendering, not like a token-by-token chatbot answer
- if streaming is used in the core product, status and section progress matter more than raw text token streaming

Reference:
- [Vercel AI SDK docs](https://context7.com/vercel/ai)

## Why Not Python in V1

Python is not required for this version.

The product does not currently depend on:

- custom model training
- offline data science workflows
- complex ETL
- advanced proprietary parsing pipelines

The core work is:

- ingesting files
- extracting text or metadata
- calling multimodal AI
- validating output against a strict contract
- storing revisions and evidence references

That fits comfortably inside TypeScript.

Python may be added later only if one of these becomes a hard bottleneck:

- advanced PDF layout extraction
- OCR quality control
- audio preprocessing
- evaluation pipelines
- retrieval/indexing experiments

## Rejected or Deferred Alternatives

### Cloud Run Monolith

Rejected for the hackathon because `Vercel` is faster for the main product workflow and iteration loop.

### GCP-Native Everything

Rejected because only AI must stay on GCP. For auth, hosting speed, and database DX, non-GCP tools are better for hackathon velocity.

### Drizzle ORM

Deferred, not rejected permanently.

It is a strong option, but `Prisma` is better for team speed in this project.

### Python AI Worker

Deferred until quality data proves it necessary.

### Vercel AI SDK as the Primary AI Layer

Rejected for v1 as the main AI integration layer.

Reason:

- it is valuable for chat and streaming UX
- it is not the best primary fit for a product whose main requirement is direct multimodal processing on `Vertex AI`
- it adds an extra abstraction where the core product benefits more from using the Google SDK directly

## UI Novelty Dependencies

### react-bits

Use selectively for:

- optional landing page background
- empty states
- controlled decorative overlays

Do not use it in the core authenticated workspace if it hurts readability or performance.

Important:
- the repository currently states `MIT + Commons Clause`
- keep usage deliberate and document the dependency clearly

Reference:
- [react-bits](https://github.com/DavidHDev/react-bits)

### animejs

Use for:

- brief section reveal transitions
- panel open/close transitions
- subtle landing motion

Do not use it for heavy infinite motion in the work area.

Reference:
- [animejs](https://github.com/juliangarnier/anime)

### web-haptics

Use only on supported mobile devices and only for meaningful success actions.

Do not tie core UX to haptics.

Reference:
- [web-haptics](https://github.com/lochie/web-haptics)

## Planned Testing Stack

- `Vitest`
- `React Testing Library`
- `@testing-library/jest-dom`
- `Playwright`
- `axe-core`

Reference:
- [Vitest docs](https://context7.com/vitest-dev/vitest)
- [React Testing Library docs](https://context7.com/testing-library/react-testing-library)
- [Playwright docs](https://context7.com/microsoft/playwright)
