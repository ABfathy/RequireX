# Inngest Deployment Guide

This app deploys Inngest through the existing Next.js app. You do not deploy a separate Inngest server. Vercel hosts the app and the `/api/inngest` endpoint, then Inngest Cloud connects to that endpoint.

## What Gets Deployed

When the app is deployed to Vercel, this endpoint is deployed with it:

```txt
https://your-vercel-domain.vercel.app/api/inngest
```

Inngest Cloud uses that endpoint to discover and run the registered background functions.

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

Inngest should discover 5 functions:

```txt
Generate brief from text
Process PDF source asset
Process audio source asset
Generate brief snapshot
Regenerate brief snapshot
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
  "function_count": 5,
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
  "function_count": 5,
  "mode": "dev"
}
```

That is okay locally when using the Inngest Dev Server. Production should show both keys as `true`.

## Verify A Real Run

1. Open the deployed app.
2. Trigger a brief generation flow from the UI.
3. Open Inngest Cloud.
4. Go to Events or Runs.
5. Confirm that Inngest receives the event and starts a function run.

## Troubleshooting

If `/api/inngest` returns `404`, the app deployment does not include the Inngest route or the URL is wrong.

If `function_count` is `0`, the route is reachable but no functions were registered.

If `has_event_key` is `false` in Production, `INNGEST_EVENT_KEY` is missing from Vercel.

If `has_signing_key` is `false` in Production, `INNGEST_SIGNING_KEY` is missing from Vercel.

If the route works but no jobs run, make sure the endpoint was synced in Inngest Cloud and that `BRIEF_GENERATION_ASYNC=1` is set in Vercel.

If Production shows `mode: "dev"`, remove `INNGEST_DEV=1` from the Vercel Production environment and redeploy.
