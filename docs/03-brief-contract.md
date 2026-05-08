# Brief Contract

## Purpose

Every generation must produce a stable, reviewable brief artifact that can be:

- rendered consistently
- versioned safely
- cited back to real source material
- commented on by clients
- regenerated into a new snapshot without mutating old ones

The persistence source of truth is an immutable `BriefSnapshot` tree plus review/history records around it.

## Core Persistence Decisions

- generated brief content is stored relationally, not as one free-form JSON blob
- each successful generation creates a new immutable `BriefSnapshot`
- `BriefClaim` rows hold `SUMMARY` and `GOALS`
- `BriefQuestion` rows hold `AMBIGUITIES` and `FOLLOW_UP_QUESTIONS`
- `EvidenceRef` rows reference both the snapshot item and the real normalized source chunk behind it
- client comments and answers attach to a specific snapshot version
- `ShareLink` is frozen to one snapshot version
- `ProcessingJob` exists as a durable async state record

## Canonical Runtime Shape

### BriefSnapshot

```ts
type BriefSnapshot = {
  id: string;
  projectId: string;
  sessionId: string;
  version: number;
  status: "draft" | "shared" | "confirmed" | "superseded";
  sourceBundleVersion: number;
  summary: BriefClaim[];
  goals: BriefClaim[];
  ambiguities: BriefQuestion[];
  followUpQuestions: BriefQuestion[];
  createdBy: string;
  createdAt: string;
};
```

### BriefClaim

```ts
type BriefClaim = {
  id: string;
  text: string;
  confidence: "low" | "medium" | "high";
  evidence: EvidenceRef[];
};
```

### BriefQuestion

```ts
type BriefQuestion = {
  id: string;
  text: string;
  reason: string;
  status: "open" | "answered" | "resolved";
  evidence: EvidenceRef[];
};
```

### EvidenceRef

```ts
type EvidenceRef = {
  sourceAssetId: string;
  sourceChunkId: string;
  sourceType: "text" | "audio" | "image" | "pdf";
  label: string;
  locator: EvidenceLocator;
  excerpt: string;
  previewUrl?: string | null;
};
```

### EvidenceLocator

```ts
type EvidenceLocator =
  | {
      kind: "text-range";
      messageIndex?: number;
      paragraphStart?: number;
      paragraphEnd?: number;
    }
  | {
      kind: "audio-range";
      startMs: number;
      endMs: number;
      transcriptChunk?: number;
    }
  | {
      kind: "pdf-range";
      page: number;
      paragraphStart?: number;
      paragraphEnd?: number;
    }
  | {
      kind: "image-note";
      regionLabel?: string;
      extractedHint?: string;
    };
```

### BriefComment

```ts
type BriefComment = {
  id: string;
  snapshotId: string;
  section: "summary" | "goals" | "ambiguities" | "followUpQuestions";
  anchorType: "section" | "claim" | "question" | "text-range";
  claimId?: string | null;
  questionId?: string | null;
  selectionText?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
  body: string;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
};
```

### FollowUpAnswer

```ts
type FollowUpAnswer = {
  id: string;
  snapshotId: string;
  questionId: string;
  body: string;
  authorName?: string | null;
  authorEmail?: string | null;
  createdAt: string;
};
```

### RevisionEvent

```ts
type RevisionEvent = {
  id: string;
  projectId: string;
  sessionId: string;
  snapshotId?: string | null;
  type:
    | "generated"
    | "regenerated"
    | "manual_edit"
    | "client_comment_added"
    | "client_answer_added"
    | "snapshot_restored"
    | "brief_confirmed";
  actorType: "internal_user" | "client" | "system";
  actorId?: string | null;
  summary: string;
  createdAt: string;
};
```

### ShareLink

```ts
type ShareLink = {
  id: string;
  snapshotId: string;
  token: string;
  status: "active" | "revoked" | "expired";
  createdAt: string;
  expiresAt?: string | null;
};
```

### ProcessingJob

```ts
type ProcessingJob = {
  id: string;
  sessionId: string;
  sourceSnapshotId?: string | null;
  resultSnapshotId?: string | null;
  type: "intake_processing" | "generation" | "regeneration";
  status: "queued" | "running" | "succeeded" | "failed" | "canceled";
  attemptCount: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};
```

## Source Provenance Contract

### SourceAsset

`SourceAsset` represents one original intake item.

Rules:

- file-backed assets are stored through `UploadThing`
- text-backed assets are stored directly in Postgres
- file-backed assets persist UploadThing keys, URLs, and route metadata
- source assets are attached to one `IntakeSession`

### SourceChunk

`SourceChunk` is the normalized source unit used for evidence provenance.

Rules:

- every file or text source can be normalized into one or more chunks
- chunks are ordered within their parent asset
- `EvidenceRef` rows must point to a real persisted chunk
- locator payloads stay in `Json` because they vary by source type

## Prisma Persistence Shape

The implemented schema lives in [prisma/schema.prisma](/Users/abdallah/repos/EUI-hackathon-2026/prisma/schema.prisma).

The top-level persistent models are:

- `Workspace`
- `Project`
- `IntakeSession`
- `SourceAsset`
- `SourceChunk`
- `BriefSnapshot`
- `BriefClaim`
- `BriefQuestion`
- `EvidenceRef`
- `BriefComment`
- `FollowUpAnswer`
- `RevisionEvent`
- `ShareLink`
- `ProcessingJob`

## Invariants Prisma Does Not Fully Enforce

These must be enforced in service code:

- an `EvidenceRef` must point to exactly one target item:
  - either one `BriefClaim`
  - or one `BriefQuestion`
- item-targeted comments must reference items from the same `snapshotId`
- follow-up answers must target a question in `FOLLOW_UP_QUESTIONS`
- follow-up answers must reference a question from the same `snapshotId`
- snapshots are immutable after insertion
- client comments and answers create review/history rows, not snapshot rewrites

## Naming and Deletion Policy

- deleting a `Workspace` cascades to projects and their related records
- deleting a `Project` cascades to sessions, snapshots, history, and related source records
- deleting an `IntakeSession` cascades to its source assets, chunks, snapshots, and processing jobs
- deleting a snapshot cascades to its claims, questions, evidence, comments, answers, and share links
- manual deletion of source assets after evidence has been created should be treated as an application-level admin action, not a normal user flow
