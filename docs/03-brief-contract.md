# Brief Contract

## Purpose

Every AI generation must produce a stable contract-shaped object so the app can:

- render briefs consistently
- attach citations predictably
- support client comments by section
- support versioning and rollback
- validate output before persisting it

## Core Principle

The app does not store a vague LLM paragraph dump as its source of truth.

The source of truth is a structured `BriefSnapshot`.

## Persistence Decision

The app will use a normalized relational persistence model for generated brief content.

This means:

- `BriefSnapshot` remains the versioned parent artifact
- `BriefClaim` rows store generated items for `summary` and `goals`
- `BriefQuestion` rows store generated items for `ambiguities` and `followUpQuestions`
- `EvidenceRef` rows store claim-level or question-level evidence references
- comments and answers target persisted snapshot items, not transient UI-only IDs

Decision rationale:

- evidence is a first-class product feature, not a decorative add-on
- item-level review and comment targeting are simpler with row-backed entities
- DB integrity is stronger when snapshot items and evidence are addressable records
- querying evidence, confidence, and question state across snapshots is easier later

Design rule:

- snapshots are immutable after persistence
- every successful generation or regeneration creates a new `BriefSnapshot`
- child claims, questions, and evidence are inserted as a new tree under that snapshot
- prior snapshots and prior child rows are never mutated into the next version

## Canonical Types

### BriefSnapshot

```ts
type BriefSnapshot = {
  id: string;
  projectId: string;
  sessionId: string;
  version: number;
  status: "draft" | "shared" | "confirmed" | "superseded";
  summary: BriefClaim[];
  goals: BriefClaim[];
  ambiguities: BriefQuestion[];
  followUpQuestions: BriefQuestion[];
  sourceBundleVersion: number;
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
  clientResponse?: string | null;
  evidence: EvidenceRef[];
};
```

### EvidenceRef

```ts
type EvidenceRef = {
  sourceAssetId: string;
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
    | "snapshot_restored";
  actorType: "internal_user" | "client" | "system";
  actorId?: string | null;
  summary: string;
  createdAt: string;
};
```

### BriefComment

```ts
type BriefComment = {
  id: string;
  snapshotId: string;
  section: "summary" | "goals" | "ambiguities" | "followUpQuestions";
  claimId?: string | null;
  questionId?: string | null;
  authorName?: string | null;
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
  createdAt: string;
};
```

### ShareLink

```ts
type ShareLink = {
  id: string;
  snapshotId: string;
  token: string;
  status: "active" | "revoked";
  createdAt: string;
  expiresAt?: string | null;
};
```

## Prisma Persistence Shape

The Prisma schema should persist the contract as relational records under an immutable snapshot.

Notes:

- `Project`, `IntakeSession`, and `SourceAsset` remain top-level models outside this excerpt
- `EvidenceLocator` should stay in a `Json` field because its structure varies by source type
- the invariant "an evidence row belongs to either a claim or a question, but not both" must be enforced in application logic and optionally with a database check constraint

```prisma
model BriefSnapshot {
  id                  String              @id @default(cuid())
  projectId           String
  sessionId           String
  version             Int
  status              BriefSnapshotStatus @default(DRAFT)
  sourceBundleVersion Int
  createdBy           String
  createdAt           DateTime            @default(now())

  project             Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  session             IntakeSession       @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  claims              BriefClaim[]
  questions           BriefQuestion[]
  comments            BriefComment[]
  answers             FollowUpAnswer[]
  revisionEvents      RevisionEvent[]
  shareLinks          ShareLink[]

  @@unique([sessionId, version])
  @@index([projectId, createdAt])
  @@index([sessionId, createdAt])
}

model BriefClaim {
  id          String            @id @default(cuid())
  snapshotId  String
  section     BriefClaimSection
  orderIndex  Int
  text        String
  confidence  BriefConfidence
  createdAt   DateTime          @default(now())

  snapshot    BriefSnapshot     @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  evidence    EvidenceRef[]
  comments    BriefComment[]

  @@unique([snapshotId, section, orderIndex])
  @@index([snapshotId, section, orderIndex])
}

model BriefQuestion {
  id             String               @id @default(cuid())
  snapshotId     String
  section        BriefQuestionSection
  orderIndex     Int
  text           String
  reason         String
  status         BriefQuestionStatus  @default(OPEN)
  clientResponse String?
  createdAt      DateTime             @default(now())

  snapshot       BriefSnapshot        @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  evidence       EvidenceRef[]
  comments       BriefComment[]
  answers        FollowUpAnswer[]

  @@unique([snapshotId, section, orderIndex])
  @@index([snapshotId, section, orderIndex])
}

model EvidenceRef {
  id            String         @id @default(cuid())
  snapshotId    String
  sourceAssetId String
  claimId       String?
  questionId    String?
  sourceType    SourceType
  label         String
  locator       Json
  excerpt       String
  previewUrl    String?
  createdAt     DateTime       @default(now())

  snapshot      BriefSnapshot  @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  sourceAsset   SourceAsset    @relation(fields: [sourceAssetId], references: [id], onDelete: Restrict)
  claim         BriefClaim?    @relation(fields: [claimId], references: [id], onDelete: Cascade)
  question      BriefQuestion? @relation(fields: [questionId], references: [id], onDelete: Cascade)

  @@index([snapshotId])
  @@index([sourceAssetId])
  @@index([claimId])
  @@index([questionId])
}

model BriefComment {
  id          String              @id @default(cuid())
  snapshotId  String
  section     BriefCommentSection
  claimId     String?
  questionId  String?
  authorName  String?
  body        String
  status      BriefCommentStatus  @default(OPEN)
  createdAt   DateTime            @default(now())

  snapshot    BriefSnapshot       @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  claim       BriefClaim?         @relation(fields: [claimId], references: [id], onDelete: SetNull)
  question    BriefQuestion?      @relation(fields: [questionId], references: [id], onDelete: SetNull)

  @@index([snapshotId, createdAt])
  @@index([claimId])
  @@index([questionId])
}

model FollowUpAnswer {
  id          String         @id @default(cuid())
  snapshotId  String
  questionId  String
  authorName  String?
  body        String
  createdAt   DateTime       @default(now())

  snapshot    BriefSnapshot  @relation(fields: [snapshotId], references: [id], onDelete: Cascade)
  question    BriefQuestion  @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@index([snapshotId, createdAt])
  @@index([questionId])
}

model RevisionEvent {
  id          String             @id @default(cuid())
  projectId   String
  sessionId   String
  snapshotId  String?
  type        RevisionEventType
  actorType   RevisionActorType
  actorId     String?
  summary     String
  createdAt   DateTime           @default(now())

  project     Project            @relation(fields: [projectId], references: [id], onDelete: Cascade)
  session     IntakeSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  snapshot    BriefSnapshot?     @relation(fields: [snapshotId], references: [id], onDelete: SetNull)

  @@index([projectId, createdAt])
  @@index([sessionId, createdAt])
  @@index([snapshotId])
}

model ShareLink {
  id         String          @id @default(cuid())
  snapshotId String
  token      String          @unique
  status     ShareLinkStatus @default(ACTIVE)
  createdAt  DateTime        @default(now())
  expiresAt  DateTime?

  snapshot   BriefSnapshot   @relation(fields: [snapshotId], references: [id], onDelete: Cascade)

  @@index([snapshotId])
  @@index([status, expiresAt])
}

enum BriefSnapshotStatus {
  DRAFT
  SHARED
  CONFIRMED
  SUPERSEDED
}

enum BriefClaimSection {
  SUMMARY
  GOALS
}

enum BriefQuestionSection {
  AMBIGUITIES
  FOLLOW_UP_QUESTIONS
}

enum BriefConfidence {
  LOW
  MEDIUM
  HIGH
}

enum BriefQuestionStatus {
  OPEN
  ANSWERED
  RESOLVED
}

enum BriefCommentSection {
  SUMMARY
  GOALS
  AMBIGUITIES
  FOLLOW_UP_QUESTIONS
}

enum BriefCommentStatus {
  OPEN
  ACKNOWLEDGED
  RESOLVED
}

enum RevisionEventType {
  GENERATED
  REGENERATED
  MANUAL_EDIT
  CLIENT_COMMENT_ADDED
  CLIENT_ANSWER_ADDED
  SNAPSHOT_RESTORED
}

enum RevisionActorType {
  INTERNAL_USER
  CLIENT
  SYSTEM
}

enum ShareLinkStatus {
  ACTIVE
  REVOKED
}
```

## Persistence Invariants

These rules must hold regardless of the UI or generation implementation:

- a `BriefClaim` belongs to exactly one snapshot
- a `BriefQuestion` belongs to exactly one snapshot
- an `EvidenceRef` belongs to exactly one snapshot item:
  - either one `BriefClaim`
  - or one `BriefQuestion`
- `BriefComment` may target:
  - a section only
  - one claim
  - or one question
- a `FollowUpAnswer` must target a `BriefQuestion` in the `FOLLOW_UP_QUESTIONS` section
- item-targeted rows must always belong to the same snapshot as their parent `BriefComment` or `FollowUpAnswer`
- regeneration creates a fresh snapshot and fresh child rows instead of mutating previous records

## Rendering Rules

### Summary

`summary` is a list of clear claims about what the client wants.

Each entry should:

- be plain language
- be concise
- have evidence when support exists

### Goals

`goals` are the expected outcomes and success criteria inferred from the input.

Each goal should:

- describe desired behavior or deliverable
- be phrased as something that can later be validated

### Ambiguities

`ambiguities` identify blockers, missing context, or unresolved assumptions.

Each item should:

- explain what is unclear
- explain why it matters
- carry evidence where possible

### Follow-Up Questions

`followUpQuestions` are client-facing questions generated from the ambiguities.

Each one should:

- be answerable
- be specific
- map cleanly to client response collection

## Validation Rules

Before saving a snapshot:

- all four sections must exist
- each list can be empty, but should never be `null`
- each claim or question must have stable `id`
- each evidence reference must point to an existing source asset
- output must not be stored if the shape is invalid
- snapshot child rows must be written transactionally
- evidence targeting invariants must be validated before commit

## UX Rules

- citations are claim-level, not word-level
- clicking the citation icon should expose the exact source excerpt
- public clients comment by section or by target claim/question
- manual internal edits should create new snapshots or explicit events

## Versioning Rules

- every successful generation creates a new snapshot
- snapshots are immutable after persistence
- comments and answers attach to a specific snapshot
- regeneration consumes prior snapshots plus feedback and creates the next snapshot
- regeneration must never rewrite claims, questions, or evidence rows from a prior snapshot
