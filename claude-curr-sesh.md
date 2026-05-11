# Session Summary

Last refreshed: 2026-05-11

## What Is Actually Done

- Clerk auth flow is implemented, including custom sign-in/sign-up routes, OAuth callback pages, provider-level routing config, and modal cleanup on navigation.
- The internal workspace page is live and no longer hardcoded to a single mock session.
- Per-user workspace bootstrap is implemented through `ensureWorkspaceForUser()`.
- Project listing, active-project selection, and new-project creation are implemented.
- The editor right pane is wired to real source APIs.
- Pasted text creation works through `POST /api/sessions/[sessionId]/assets`.
- File uploads work through UploadThing `mixedUploader`.
- Source rename and delete flows are implemented against `/api/assets/[assetId]`.
- Source data is cached client-side per project inside `EditorShell`.
- Public review comment, answer, and confirmation APIs are implemented.
- Public review service logic is covered by Vitest.
- Public review route handlers are covered by Vitest.
- Generation and regeneration request APIs are implemented up to `ProcessingJob` creation and Inngest event dispatch.

## What Is Not Done

- No processing pipeline turns source assets into chunks, claims, questions, or evidence.
- No live brief snapshots are rendered in the internal editor.
- No live share-link-backed brief is rendered on `/brief/[shareToken]`.
- No share-link creation UI exists in the internal app.
- No e2e or accessibility automation exists yet.

## Current Truths That Matter

- Source ingestion is already complete enough for real manual testing.
- Public review mutations are already real backend behavior, even though the public page UI is still mock-backed.
- The generation pipeline is not "partially working"; it is intentionally stubbed to fail after job dispatch.
- `pnpm test` and `pnpm test:unit` are meaningful today. `test:e2e` and `test:a11y` are still placeholders.

## Recommended Next Work

1. Implement source processing and snapshot creation.
2. Render real snapshots in `DocView`.
3. Render real snapshot/share-link data on the public brief page.
4. Add a share action from the internal workspace.
