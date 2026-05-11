# Feature List

## Implemented

- Internal auth flow with custom Clerk pages
- Protected internal workspace route
- Automatic workspace bootstrap per user
- Project list loading and active-project switching
- New project creation with automatic initial intake session
- Source listing for the active session
- Pasted-text source creation
- File uploads for image, PDF, and audio source inputs
- Source rename
- Source delete with status guardrails
- Public review comment API
- Public review follow-up answer API
- Public review confirmation API
- Public review rate limiting
- Revision-event audit writes for public review mutations

## Partial

- Internal editor UI: interactive, but brief content is still placeholder data
- Public brief UI: designed and responsive, but still placeholder data
- Generation requests: API and job dispatch exist, processing does not
- Regeneration requests: API and job dispatch exist, processing does not
- Revision history: persistence model exists, UI is not connected

## Missing

- Source chunking
- Evidence extraction
- Brief snapshot creation
- Brief snapshot rendering in `/app`
- Snapshot-backed public brief rendering in `/brief/[shareToken]`
- Share-link creation flow from the internal app
- Internal review / approval workflow over generated snapshots
- Real revision browser
- E2E tests
- Accessibility automation

## Explicitly Not True Anymore

- The repo is not just a planning package.
- Source ingestion is not "next"; it is already implemented.
- Public review mutations are not speculative; they are implemented and tested.
