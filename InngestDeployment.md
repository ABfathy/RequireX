# Inngest Deployment Guide

This app deploys Inngest through the existing Next.js app. You do not deploy a separate Inngest server. Vercel hosts the app and the `/api/inngest` endpoint, then Inngest Cloud connects to that endpoint.

## What Gets Deployed

When the app is deployed to Vercel, this endpoint is deployed with it:

```txt
https://your-vercel-domain.vercel.app/api/inngest
```

Inngest Cloud uses that endpoint to discover and run the registered background functions.

For the current app architecture, Inngest should only run source-file preprocessing.
The Next.js server is responsible for building the prompt, calling the AI model,
streaming the response, and saving the generated brief.

Only these Inngest functions should be registered:

```txt
Process PDF source asset
Process audio source asset
```

These legacy generation functions should not be registered:

```txt
Generate brief from text
Generate brief snapshot
Regenerate brief snapshot
```

They are legacy or placeholder generation paths. Keeping them registered makes
the Inngest dashboard misleading and can create failing legacy runs, while the
current app handles generation in the Next.js server.

Inngest discovers whatever is exported from `src/server/inngest/functions.ts`.
For this deployment, the registered function list should be:

```ts
export const inngestFunctions = [
  processPdfSourceAsset,
  processAudioSourceAsset,
];
```

## Required Environment Variables

In Vercel, the Production environment needs:

```txt
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
BRIEF_GENERATION_ASYNC=1
```

Do not set this in Production:

```txt
INNGEST_DEV=1
```

`INNGEST_DEV=1` is only for local development.

## Recommended Setup: Vercel Integration

1. Go to [Inngest Cloud](https://app.inngest.com/).
2. Sign in or create an account.
3. Create or open your Inngest project/app.
4. Go to the Inngest integrations area.
5. Connect the Vercel integration.
6. Select the Vercel project that deploys this Next.js app.
7. Allow Inngest to add the required environment variables to Vercel.
8. In Vercel, open the project settings.
9. Go to `Settings -> Environment Variables`.
10. Confirm these exist for Production:

```txt
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
```

11. Add this variable if it is missing:

```txt
BRIEF_GENERATION_ASYNC=1
```

12. Make sure `INNGEST_DEV=1` is not set in Production.
13. Redeploy the Vercel app from `Deployments -> Redeploy`.

## Manual Setup

Use this path if you do not want to use the Vercel integration.

1. Go to [Inngest Cloud](https://app.inngest.com/).
2. Open the target environment, usually Production.
3. Create or copy an Event Key.
4. Add it to Vercel as:

```txt
INNGEST_EVENT_KEY=your_event_key
```

5. Open the environment's Signing Key tab in Inngest Cloud.
6. Copy the Signing Key.
7. Add it to Vercel as:

```txt
INNGEST_SIGNING_KEY=your_signing_key
```

8. Add async generation mode to Vercel:

```txt
BRIEF_GENERATION_ASYNC=1
```

9. Make sure `INNGEST_DEV=1` is not set in Production.
10. Redeploy the Vercel app.

## Sync The Inngest Endpoint

After the Vercel deployment finishes, sync the deployed endpoint in Inngest Cloud:

```txt
https://your-vercel-domain.vercel.app/api/inngest
```

Inngest should discover 2 functions:

```txt
Process PDF source asset
Process audio source asset
```

## Test With Browser Or Postman

Send a `GET` request to:

```txt
https://your-vercel-domain.vercel.app/api/inngest
```

Expected successful response:

```json
{
  "has_event_key": true,
  "has_signing_key": true,
  "function_count": 2,
  "mode": "cloud"
}
```

If you are testing locally, run the app first:

```bash
npm run dev
```

Then send a `GET` request to:

```txt
http://localhost:3000/api/inngest
```

Local development may show:

```json
{
  "has_event_key": false,
  "has_signing_key": false,
  "function_count": 2,
  "mode": "dev"
}
```

That is okay locally when using the Inngest Dev Server. Production should show both keys as `true`.

## Verify A Real Run

1. Open the deployed app.
2. Upload a PDF or audio source.
3. Trigger the brief generation flow from the UI.
4. Open Inngest Cloud.
5. Go to Events or Runs.
6. Confirm that Inngest receives only file-processing events:

```txt
source/pdf.process.requested
source/audio.process.requested
```

7. Confirm that brief generation itself is handled by the Next.js server, not by
   an Inngest generation function.
8. Confirm that text and image sources are handled by the normal brief
   generation flow and do not create Inngest generation runs.

## Troubleshooting

If `/api/inngest` returns `404`, the app deployment does not include the Inngest route or the URL is wrong.

If `function_count` is `0`, the route is reachable but no functions were registered.

If `function_count` is `5`, the deployed endpoint is still registering the
legacy generation functions. Export only `processPdfSourceAsset` and
`processAudioSourceAsset` from `src/server/inngest/functions.ts`.

If `has_event_key` is `false` in Production, `INNGEST_EVENT_KEY` is missing from Vercel.

If `has_signing_key` is `false` in Production, `INNGEST_SIGNING_KEY` is missing from Vercel.

If the route works but no jobs run, make sure the endpoint was synced in Inngest Cloud and that `BRIEF_GENERATION_ASYNC=1` is set in Vercel.

If Production shows `mode: "dev"`, remove `INNGEST_DEV=1` from the Vercel Production environment and redeploy.

## Production Checklist

- `INNGEST_EVENT_KEY` is set in Vercel Production.
- `INNGEST_SIGNING_KEY` is set in Vercel Production.
- `BRIEF_GENERATION_ASYNC=1` is set if Production should preprocess PDF/audio sources through Inngest before streaming.
- `INNGEST_DEV` is not set in Vercel Production.
- The deployed `/api/inngest` endpoint is synced in Inngest Cloud after each relevant deploy.
- The Inngest dashboard shows only:
  - `Process PDF source asset`
  - `Process audio source asset`
