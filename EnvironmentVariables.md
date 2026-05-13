# Environment Variables

This file lists the environment variables used by the app. It intentionally does not include real secret values.

Use placeholders locally, and store real secrets only in `.env`, Vercel Environment Variables, or the relevant provider dashboard.

## Production Variables

Set these in Vercel for the Production environment.

```txt
NEXT_PUBLIC_APP_URL=https://your-production-domain.com

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_or_test_placeholder
CLERK_SECRET_KEY=sk_live_or_test_placeholder

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app

UPLOADTHING_TOKEN=uploadthing_token_placeholder

GOOGLE_CLOUD_PROJECT=google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

BRIEF_GENERATION_ASYNC=1

INNGEST_EVENT_KEY=inngest_event_key_placeholder
INNGEST_SIGNING_KEY=inngest_signing_key_placeholder
```

## Local Development Variables

Use these in local `.env`.

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
CLERK_SECRET_KEY=sk_test_placeholder

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/app

UPLOADTHING_TOKEN=uploadthing_token_placeholder

GOOGLE_CLOUD_PROJECT=google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

BRIEF_GENERATION_ASYNC=0

INNGEST_DEV=1
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

## Optional Variables

These are useful in specific situations.

```txt
SEED_USER_ID=clerk_user_id_placeholder

NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/app
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/app
```

## Variable Notes

`NEXT_PUBLIC_APP_URL` is the public URL of the app. Use `http://localhost:3000` locally and the deployed URL in production.

`DATABASE_URL` is the PostgreSQL connection string used by Prisma.

`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is safe to expose to the browser, but still keep it managed through environment variables.

`CLERK_SECRET_KEY` is server-only and must never be exposed in client code.

`UPLOADTHING_TOKEN` is required for UploadThing file uploads.

`GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` configure the Google AI/Vertex location.

`GOOGLE_APPLICATION_CREDENTIALS` is for local development and should point to a local service account JSON file.

`GOOGLE_SERVICE_ACCOUNT_JSON` is for deployments like Vercel. Paste the full service account JSON as one minified string.

`BRIEF_GENERATION_ASYNC=1` enables the Inngest-backed async generation path. Use this in production after Inngest is configured.

`INNGEST_EVENT_KEY` lets the app send events to Inngest Cloud.

`INNGEST_SIGNING_KEY` lets Inngest and the app verify requests securely.

`INNGEST_DEV=1` is local-only. Do not set it in production.

`SEED_USER_ID` is only needed when running Prisma seed data tied to a real Clerk user.

## Vercel Checklist

Before deploying to Vercel, confirm these are set:

```txt
DATABASE_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
UPLOADTHING_TOKEN
GOOGLE_CLOUD_PROJECT
GOOGLE_CLOUD_LOCATION
GOOGLE_SERVICE_ACCOUNT_JSON
BRIEF_GENERATION_ASYNC
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
```

Also confirm this is not set in Vercel Production:

```txt
INNGEST_DEV
```
