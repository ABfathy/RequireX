# Brief Contract

This contract describes the structured output shape the database and public review APIs are already designed around, even though generation and rendering are not fully wired yet.

## Snapshot

A brief version is stored as `BriefSnapshot`.

Key fields:

- `projectId`
- `sessionId`
- `version`
- `status`: `DRAFT | SHARED | CONFIRMED | SUPERSEDED`
- `sourceBundleVersion`

## Claims

Structured requirements or assertions are stored as `BriefClaim`.

Key fields:

- `snapshotId`
- `section`
- `orderIndex`
- `text`
- `confidence`

Claims are the primary target for:

- evidence attachment
- inline client comments

## Follow-Up Questions

Open clarification items are stored as `BriefQuestion`.

Key fields:

- `snapshotId`
- `section`
- `orderIndex`
- `text`
- `reason`
- `status`: `OPEN | ANSWERED | DISMISSED`

Questions can receive both comments and formal follow-up answers.

## Evidence

Evidence is stored as `EvidenceRef`.

Each evidence row links:

- one snapshot
- one source asset
- one source chunk
- optionally one claim
- optionally one question

Expected evidence fields:

- `label`
- `locator`
- `excerpt`
- optional `previewUrl`

## Public Review

Public access is mediated through `ShareLink`.

Public reviewers can currently submit:

- `BriefComment`
- `FollowUpAnswer`
- confirmation of a shared snapshot

The service layer already enforces:

- share link must exist and be `ACTIVE`
- expired links are treated as not found
- snapshot must be `SHARED` for comments and answers
- confirmation is idempotent for already confirmed snapshots

## Current Gap

The schema and mutation services already assume this contract, but the internal editor and public brief UI do not yet render live `BriefSnapshot`, `BriefClaim`, `BriefQuestion`, or `EvidenceRef` data.
