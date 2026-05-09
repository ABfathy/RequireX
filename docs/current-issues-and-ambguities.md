# Current Issues and Ambiguities

## Resolved in Workstream 2

These items are no longer open and should be treated as locked:

- `ShareLink` uses a frozen-link model tied to one snapshot
- `SourceChunk` exists and is the evidence provenance layer
- `ProcessingJob` exists as a durable async state model
- `UploadThing` is the only file upload and file storage provider
- `Supabase` is used for Postgres only
- snapshots are immutable after insert
- actor identity uses external IDs only in v1

## Remaining Open Questions

## 1. Public Mutation Security Contract

Resolved:

- share-token possession is the v1 public write credential
- comments, answers, and confirmation require an `ACTIVE`, unexpired `ShareLink`
- public writes are allowed only while the linked snapshot status is `SHARED`
- `CONFIRMED` and `SUPERSEDED` snapshots are write-closed
- public endpoints use best-effort per-IP per-share-token rate limiting in app memory
- confirmation is idempotent once the snapshot is already `CONFIRMED`

## 2. Regeneration Authority Order

The product still needs an explicit precedence rule for regeneration inputs:

- raw source material
- client follow-up answers
- client comments
- internal manual refinements
- previous snapshot content

This should be written before Workstream 5 goes too far.

## 3. Snapshot Mutation Decision Table

Partially resolved:

- public confirmation mutates snapshot status in place from `SHARED` to `CONFIRMED`
- client comments and answers create only review/history rows plus `RevisionEvent` rows

Still open:

- when a new snapshot is created
- when only a `RevisionEvent` is created
- whether restore creates a new snapshot or reactivates an old one

## 4. Canonical Read Models

The database shape is now stable, but the UI still needs two assembled server-side read models:

- internal workspace brief view
- public frozen brief review view

Those nested shapes should be specified before the internal and public UI streams diverge.
