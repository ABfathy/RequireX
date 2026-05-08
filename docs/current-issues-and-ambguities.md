# Current Issues and Ambiguities

## Organizer Decisions Already Applied

The following items are no longer open after the Softworks meeting and should not be treated as active scope questions:

- one project always has one client and one source of truth
- multiple chats or intake sessions may exist inside a project
- client review should be inline and brief-first, not a public chat surface
- `n8n` and third-party intake automation are out of core hackathon scope
- landing page work is optional polish only
- a lightweight access gate before viewing the brief is a bonus, not a core requirement

This document captures the remaining high-level implementation issues that are still unresolved after locking the normalized relational persistence model for generated brief content.

These are not generic concerns about ambition or polish. They are concrete behavior, data, and systems questions that should be decided before parallel implementation goes too far.

## 1. Share Link Version Semantics

### Why this matters

The public review flow depends on whether a share link is tied to a specific snapshot forever or whether it should move forward to the latest regenerated snapshot.

The current docs imply a snapshot-linked model:

- `ShareLink.snapshotId` exists in the brief contract
- the Prisma persistence shape also links `ShareLink` directly to `BriefSnapshot`

But the task list still leaves the expected behavior open by saying the team should verify what old share links should do after regeneration.

### What is still ambiguous

- Is a share link frozen to one snapshot version?
- If a new brief version is generated, should the client continue seeing the old version or be moved to the latest one?
- If links are frozen, does the internal user create a new link on every shareable revision?
- If links move, how do comments and answers remain attached to the correct reviewed version?

### Why it must be decided early

- public route loading logic depends on it
- comment and answer targeting depend on it
- internal review expectations depend on it
- auditability and client trust depend on it

### Recommended resolution

Pick one of these explicitly:

- `Frozen link model`: each share link points to one snapshot permanently
- `Moving link model`: one stable public token always resolves to the latest approved snapshot

If the team values evidence traceability and version clarity more than convenience, the frozen-link model is usually safer.

## 2. Public Mutation Security Contract

### Why this matters

The app intentionally leaves public review routes open so clients can comment, answer questions, and confirm a brief without an account.

That means comments, answers, and confirmations are public mutations, not just public reads.

### What is still ambiguous

- Is possession of a share token enough to authorize comments, answers, and confirmation?
- What rate limiting applies to public mutations?
- How are duplicate submissions handled?
- Are confirmation actions idempotent?
- Can an old share link still submit data after a newer version exists?
- Do you want optional lightweight client identity capture, or fully anonymous actions only?

### Why it must be decided early

- route handlers need a clear authorization model
- abuse protection cannot be retrofitted cleanly at the end
- public review UX depends on whether repeated submission and replay are allowed

### Recommended resolution

Document a concrete public mutation policy covering:

- token-based authorization rules
- rate limits
- idempotency behavior
- duplicate submission handling
- whether old links remain writable

## 3. Evidence Provenance and Source Chunking Contract

### Why this matters

The product’s evidence feature is only strong if every stored `EvidenceRef` can be traced to a real source chunk that existed before generation.

The contract already requires exact evidence references with source-specific locator shapes. The missing piece is how raw input becomes addressable source units the model can cite.

### What is still ambiguous

- What is the actual unit of evidence?
- For text, is it a message, paragraph, or chunk?
- For audio, is it transcript segment, sentence, or time range block?
- For PDF, is it page-level, paragraph-level, or extracted block-level?
- For images, is it a manual note, OCR block, or model-generated observation?
- How are source chunks identified and persisted before generation?
- Is the model allowed to invent locator detail, or must it cite only precomputed chunks?

### Why it must be decided early

- the extraction pipeline depends on it
- prompt structure depends on it
- evidence validation depends on it
- UI citation drill-down depends on it

### Recommended resolution

Define a source normalization and chunking contract:

- each uploaded asset is normalized into addressable chunks
- each chunk gets a stable ID
- generation prompts may reference only those chunk IDs
- `EvidenceRef` rows are derived from chunk-backed citations, not invented free-form evidence

## 4. Generation and Regeneration Authority Rules

### Why this matters

The system will combine multiple forms of truth:

- original raw client material
- prior brief snapshots
- internal refinements
- client comments
- follow-up answers

Without explicit precedence rules, different parts of the app will make different assumptions about what the next snapshot should trust most.

### What is still ambiguous

- If raw input conflicts with an internal manual refinement, which wins?
- If a client comment conflicts with the prior snapshot, is the comment authoritative or only advisory?
- Are follow-up answers stronger than inferred goals or ambiguities?
- During regeneration, is the previous snapshot a hint, a source, or a draft baseline?
- Are internal manual edits treated as first-class structured inputs into regeneration?

### Why it must be decided early

- regeneration prompts depend on it
- revision summaries depend on it
- internal trust in the system depends on it

### Recommended resolution

Write a regeneration authority contract that explicitly orders inputs, for example:

- explicit client follow-up answers
- explicit internal manual refinements
- original raw source material
- previous snapshot as draft context only

The exact order is a product choice, but it must be written down.

## 5. Snapshot Immutability Boundaries

### Why this matters

The docs now define snapshots as immutable, which is the correct base rule. But there are still unresolved questions about which user actions create a new snapshot versus only a history event.

### What is still ambiguous

- Does every internal refinement create a new snapshot?
- Does adding a client comment create only a `RevisionEvent`, or can it also change question status?
- Does confirming a brief mutate snapshot status in place, or produce a new confirmed snapshot?
- Does restoring an old snapshot create a new row or flip status flags on existing rows?

### Why it must be decided early

- service methods and transactions depend on it
- revision history consistency depends on it
- UI timeline expectations depend on it

### Recommended resolution

Create a decision table listing each mutation type and whether it results in:

- event only
- snapshot status update
- new snapshot creation

## 6. Cross-Snapshot Referential Invariants

### Why this matters

The relational model supports item-level comments, answers, and evidence, but some important correctness rules are broader than a simple foreign key.

For example, a comment should not point to a claim from snapshot A while also declaring itself attached to snapshot B.

### What is still ambiguous

- Where are same-snapshot checks enforced?
- Are these checks done in service code only?
- Will any database-level check constraints be added?
- How will batch writes validate that `claimId`, `questionId`, and `snapshotId` all belong together?

### Why it must be decided early

- Prisma relations alone do not fully enforce these invariants
- teams may assume the database guarantees more than it actually does
- bugs here would silently corrupt review history

### Recommended resolution

Document a transactional validation rule set for:

- `BriefComment`
- `FollowUpAnswer`
- `EvidenceRef`

Each write should validate that all referenced rows belong to the same snapshot context before commit.

## 7. Read Model for the UI

### Why this matters

The normalized relational schema is good for integrity, but the UI does not want raw tables. It wants one assembled brief view with ordered sections, evidence, comments, answers, and status metadata.

### What is still ambiguous

- What server-side shape does the internal workspace consume?
- What shape does the public brief route consume?
- Will the app assemble nested view models in route handlers, service functions, or DB queries?
- Are comments and answers embedded into items or fetched separately?

### Why it must be decided early

- internal and public UI teams need stable fixtures
- server-side rendering code needs a shared contract
- otherwise each route will join tables differently and drift

### Recommended resolution

Define one canonical read model for:

- internal brief workspace
- public brief review page

Those read models should be assembled from relational tables but returned to the UI in a nested artifact shape.

## 8. Session and Job State Machines

### Why this matters

The app depends on visible async processing states. The current docs mention asset lifecycle states and snapshot statuses, but they do not yet define a complete system state model across intake, processing, failure, generation, and review.

### What is still ambiguous

- What is the session status model?
- What is the generation job status model?
- How are partial failures represented?
- What happens if one source type fails but others succeed?
- When is a session considered review-ready?
- How are retries surfaced to the UI?

### Why it must be decided early

- async UX depends on it
- job orchestration depends on it
- retry and failure messaging depend on it

### Recommended resolution

Define explicit state machines for:

- `SourceAsset`
- `IntakeSession`
- generation/regeneration jobs
- `BriefSnapshot`

Also define which state transitions are user-visible and which are internal only.

## Summary

The major unresolved issues are no longer about stack selection or whether the product is too ambitious. They are about making the behavior contract exact enough that:

- schema work
- generation work
- public review work
- UI work
- revision/history work

can proceed in parallel without drifting into incompatible assumptions.
