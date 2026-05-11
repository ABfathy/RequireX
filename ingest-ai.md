# Inngest AI Follow-Up

This document is the remaining work list for the async AI path after the sync demo flow landed.

## Current State

- `/api/generate` runs synchronously by default.
- Setting `BRIEF_GENERATION_ASYNC=1` switches generation request handling back to Inngest dispatch.
- `src/app/api/inngest/route.ts` is present and serves registered functions.
- `brief/generation.requested` is wired to `runBriefGeneration(...)`.
- `brief/regeneration.requested` exists as an event shape, but the function still throws a non-retriable "not implemented" error.
- The old `brief/text.requested` function is legacy only and intentionally blocked.

## Do We Need Inngest?

Use Inngest if any of these are true:

- generation will exceed normal request time limits in your deployed environment
- you want retries, replay, and function-run history outside app logs
- you want queued background work for regenerate, file ingestion, transcription, or multi-step pipelines
- you need durable step orchestration instead of one large request handler

You do not need Inngest for the current hackathon demo if:

- generation stays text-first
- requests complete fast enough in one HTTP round trip
- you are fine with request-bound failure handling

Recommendation:

- keep sync as the default demo path now
- finish the Inngest path next if you plan to add file processing, regeneration, or production deployment

## Remaining Tasks

### 1. Make Async Generation a First-Class Path

- add an internal UI indicator when `BRIEF_GENERATION_ASYNC=1` so the app does not pretend generation is immediate
- add a status fetch/read model for the latest `ProcessingJob` per session
- show `QUEUED`, `RUNNING`, `SUCCEEDED`, and `FAILED` in the editor
- poll or refresh job state until completion, then refresh snapshot data

### 2. Finish Regeneration

- enable `/api/regenerate` instead of returning the legacy disabled response
- wire a regenerate button in the editor
- decide the regeneration contract:
  current snapshot as source, or current sources only, or both
- implement `brief/regeneration.requested` to call a real regeneration pipeline
- persist `RevisionEvent` with `REGENERATED`

### 3. Replace the Legacy Text Event

- remove or repurpose `brief/text.requested`
- decide whether pasted text should:
  directly persist assets only, or
  optionally kick off async generation automatically
- if not needed, delete the legacy function to reduce confusion

### 4. Add Non-Text Processing

- create async file-processing jobs for PDF, audio, and image assets
- move file assets through `UPLOADED -> QUEUED -> PROCESSING -> PROCESSED/FAILED`
- create `SourceChunk` rows from extracted text/transcripts/observations
- only allow generation to use assets that are fully processed

### 5. Harden Reliability

- make error codes consistent across sync and async paths
- confirm retries are safe and idempotent
- guard against duplicate snapshot creation for the same job
- decide whether failed jobs can be retried in place or must create new jobs
- add structured logging around event send, function start, model call, persistence, and completion

### 6. Add Tests

- route tests for `/api/generate` in async mode
- route tests for `/api/regenerate` once enabled
- unit tests for Inngest event handlers
- tests for job-state transitions and duplicate-run protection
- eventual e2e coverage for async generation UX

## Local Setup

### Required Env Vars

For Gemini on Vertex via `@google/genai`:

- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `GOOGLE_APPLICATION_CREDENTIALS`

Notes:

- this repo uses Vertex mode, not Gemini API-key mode
- you do not need `GEMINI_API_KEY` when using `new GoogleGenAI({ vertexai: true, project, location })`
- `GOOGLE_APPLICATION_CREDENTIALS` should point to a service-account JSON usable by ADC

For Inngest:

- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`
- `INNGEST_DEV=1` for local development
- `BRIEF_GENERATION_ASYNC=1` to force `/api/generate` onto the async path

## Local Bring-Up Checklist

1. Start the app:

```bash
pnpm dev
```

2. Start the Inngest dev server and point it at the app route:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

3. Confirm the dev server discovers:

- `generate-brief-from-text`
- `brief-generate-snapshot`
- `brief-regenerate-snapshot`

4. Set:

```bash
BRIEF_GENERATION_ASYNC=1
```

5. Trigger Generate Brief from the UI or call `/api/generate` manually.

6. Confirm:

- a `ProcessingJob` is created as `QUEUED`
- the event is sent successfully
- the Inngest function picks it up
- the job transitions to `RUNNING`
- a snapshot is created
- the job transitions to `SUCCEEDED`

## How To Test Brief Generation Now

### Sync Path

Use this for the current working implementation.

Env:

```bash
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
BRIEF_GENERATION_ASYNC=0
```

Then:

```bash
pnpm dev
```

In the app:

- sign in
- open `/app`
- make sure the active project/session has at least one pasted text source
- click `Generate Brief`

Expected result:

- button switches to generating state
- request completes in one round trip
- latest snapshot renders in the center pane
- `ProcessingJob` becomes `SUCCEEDED`

### Async Path

Use this only after setting up the Inngest dev server and keys.

Env:

```bash
GOOGLE_CLOUD_PROJECT=your-project
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key
INNGEST_DEV=1
BRIEF_GENERATION_ASYNC=1
```

Then:

```bash
pnpm dev
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Expected result:

- `/api/generate` returns quickly after job creation
- Inngest dev server shows the event and function run
- snapshot is created asynchronously
- UI still needs better job tracking; for now, verify in DB or logs

## What You Are Missing Today

- valid Google Cloud Vertex credentials if brief generation is failing immediately
- Inngest keys plus a running `inngest dev` process if you are testing the async path
- a non-disabled `/api/regenerate` path if you want regeneration
- async job polling/history UI if you want the editor to reflect queued background work honestly
