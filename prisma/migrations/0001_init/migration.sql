-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('DRAFT', 'COLLECTING', 'PROCESSING', 'REVIEW_READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('TEXT', 'AUDIO', 'IMAGE', 'PDF');

-- CreateEnum
CREATE TYPE "SourceAssetStatus" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceChunkKind" AS ENUM ('TEXT_BLOCK', 'TRANSCRIPT_SEGMENT', 'PDF_BLOCK', 'IMAGE_OBSERVATION');

-- CreateEnum
CREATE TYPE "BriefSnapshotStatus" AS ENUM ('DRAFT', 'SHARED', 'CONFIRMED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BriefClaimSection" AS ENUM ('SUMMARY', 'GOALS');

-- CreateEnum
CREATE TYPE "BriefQuestionSection" AS ENUM ('AMBIGUITIES', 'FOLLOW_UP_QUESTIONS');

-- CreateEnum
CREATE TYPE "BriefQuestionStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BriefCommentSection" AS ENUM ('SUMMARY', 'GOALS', 'AMBIGUITIES', 'FOLLOW_UP_QUESTIONS');

-- CreateEnum
CREATE TYPE "BriefCommentAnchorType" AS ENUM ('SECTION', 'CLAIM', 'QUESTION', 'TEXT_RANGE');

-- CreateEnum
CREATE TYPE "BriefCommentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "RevisionEventType" AS ENUM ('GENERATED', 'REGENERATED', 'MANUAL_EDIT', 'CLIENT_COMMENT_ADDED', 'CLIENT_ANSWER_ADDED', 'SNAPSHOT_RESTORED', 'BRIEF_CONFIRMED');

-- CreateEnum
CREATE TYPE "ShareLinkStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ProcessingJobType" AS ENUM ('INTAKE_PROCESSING', 'GENERATION', 'REGENERATION');

-- CreateEnum
CREATE TYPE "ProcessingJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('INTERNAL_USER', 'CLIENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BriefConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceAsset" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "status" "SourceAssetStatus" NOT NULL DEFAULT 'UPLOADED',
    "displayLabel" TEXT,
    "originalFileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "textContent" TEXT,
    "routeSlug" TEXT,
    "utKey" TEXT,
    "ufsUrl" TEXT,
    "appUrl" TEXT,
    "customId" TEXT,
    "folderLabel" TEXT,
    "providerMetadata" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "SourceAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "kind" "SourceChunkKind" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "locator" JSONB NOT NULL,
    "pageNumber" INTEGER,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "chunkLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BriefSnapshotStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceBundleVersion" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefClaim" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "section" "BriefClaimSection" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" "BriefConfidence" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefQuestion" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "section" "BriefQuestionSection" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BriefQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BriefQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidenceRef" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "sourceAssetId" TEXT NOT NULL,
    "sourceChunkId" TEXT NOT NULL,
    "claimId" TEXT,
    "questionId" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "locator" JSONB NOT NULL,
    "excerpt" TEXT NOT NULL,
    "previewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenceRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefComment" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "section" "BriefCommentSection" NOT NULL,
    "anchorType" "BriefCommentAnchorType" NOT NULL,
    "claimId" TEXT,
    "questionId" TEXT,
    "selectionText" TEXT,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "body" TEXT NOT NULL,
    "status" "BriefCommentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpAnswer" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "snapshotId" TEXT,
    "type" "RevisionEventType" NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "ShareLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingJob" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sourceSnapshotId" TEXT,
    "resultSnapshotId" TEXT,
    "type" "ProcessingJobType" NOT NULL,
    "status" "ProcessingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payload" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Project_workspaceId_createdAt_idx" ON "Project"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "IntakeSession_projectId_createdAt_idx" ON "IntakeSession"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "IntakeSession_projectId_updatedAt_idx" ON "IntakeSession"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "IntakeSession_projectId_status_idx" ON "IntakeSession"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SourceAsset_utKey_key" ON "SourceAsset"("utKey");

-- CreateIndex
CREATE UNIQUE INDEX "SourceAsset_customId_key" ON "SourceAsset"("customId");

-- CreateIndex
CREATE INDEX "SourceAsset_sessionId_createdAt_idx" ON "SourceAsset"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SourceAsset_sessionId_status_idx" ON "SourceAsset"("sessionId", "status");

-- CreateIndex
CREATE INDEX "SourceAsset_sessionId_sourceType_idx" ON "SourceAsset"("sessionId", "sourceType");

-- CreateIndex
CREATE INDEX "SourceChunk_sourceAssetId_orderIndex_idx" ON "SourceChunk"("sourceAssetId", "orderIndex");

-- CreateIndex
CREATE INDEX "SourceChunk_sourceAssetId_kind_idx" ON "SourceChunk"("sourceAssetId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SourceChunk_sourceAssetId_orderIndex_key" ON "SourceChunk"("sourceAssetId", "orderIndex");

-- CreateIndex
CREATE INDEX "BriefSnapshot_projectId_createdAt_idx" ON "BriefSnapshot"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "BriefSnapshot_sessionId_createdAt_idx" ON "BriefSnapshot"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BriefSnapshot_sessionId_version_key" ON "BriefSnapshot"("sessionId", "version");

-- CreateIndex
CREATE INDEX "BriefClaim_snapshotId_section_orderIndex_idx" ON "BriefClaim"("snapshotId", "section", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "BriefClaim_snapshotId_section_orderIndex_key" ON "BriefClaim"("snapshotId", "section", "orderIndex");

-- CreateIndex
CREATE INDEX "BriefQuestion_snapshotId_section_orderIndex_idx" ON "BriefQuestion"("snapshotId", "section", "orderIndex");

-- CreateIndex
CREATE INDEX "BriefQuestion_snapshotId_status_idx" ON "BriefQuestion"("snapshotId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BriefQuestion_snapshotId_section_orderIndex_key" ON "BriefQuestion"("snapshotId", "section", "orderIndex");

-- CreateIndex
CREATE INDEX "EvidenceRef_snapshotId_claimId_idx" ON "EvidenceRef"("snapshotId", "claimId");

-- CreateIndex
CREATE INDEX "EvidenceRef_snapshotId_questionId_idx" ON "EvidenceRef"("snapshotId", "questionId");

-- CreateIndex
CREATE INDEX "EvidenceRef_sourceAssetId_idx" ON "EvidenceRef"("sourceAssetId");

-- CreateIndex
CREATE INDEX "EvidenceRef_sourceChunkId_idx" ON "EvidenceRef"("sourceChunkId");

-- CreateIndex
CREATE INDEX "BriefComment_snapshotId_createdAt_idx" ON "BriefComment"("snapshotId", "createdAt");

-- CreateIndex
CREATE INDEX "BriefComment_snapshotId_section_status_idx" ON "BriefComment"("snapshotId", "section", "status");

-- CreateIndex
CREATE INDEX "FollowUpAnswer_snapshotId_createdAt_idx" ON "FollowUpAnswer"("snapshotId", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUpAnswer_questionId_createdAt_idx" ON "FollowUpAnswer"("questionId", "createdAt");

-- CreateIndex
CREATE INDEX "RevisionEvent_projectId_createdAt_idx" ON "RevisionEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "RevisionEvent_sessionId_createdAt_idx" ON "RevisionEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "RevisionEvent_snapshotId_createdAt_idx" ON "RevisionEvent"("snapshotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ShareLink_snapshotId_createdAt_idx" ON "ShareLink"("snapshotId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessingJob_sessionId_createdAt_idx" ON "ProcessingJob"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ProcessingJob_sessionId_status_idx" ON "ProcessingJob"("sessionId", "status");

-- CreateIndex
CREATE INDEX "ProcessingJob_type_status_idx" ON "ProcessingJob"("type", "status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeSession" ADD CONSTRAINT "IntakeSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceAsset" ADD CONSTRAINT "SourceAsset_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "SourceAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefSnapshot" ADD CONSTRAINT "BriefSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefSnapshot" ADD CONSTRAINT "BriefSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefClaim" ADD CONSTRAINT "BriefClaim_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefQuestion" ADD CONSTRAINT "BriefQuestion_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRef" ADD CONSTRAINT "EvidenceRef_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRef" ADD CONSTRAINT "EvidenceRef_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "SourceAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRef" ADD CONSTRAINT "EvidenceRef_sourceChunkId_fkey" FOREIGN KEY ("sourceChunkId") REFERENCES "SourceChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRef" ADD CONSTRAINT "EvidenceRef_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "BriefClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenceRef" ADD CONSTRAINT "EvidenceRef_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BriefQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "BriefClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefComment" ADD CONSTRAINT "BriefComment_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BriefQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAnswer" ADD CONSTRAINT "FollowUpAnswer_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpAnswer" ADD CONSTRAINT "FollowUpAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "BriefQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionEvent" ADD CONSTRAINT "RevisionEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionEvent" ADD CONSTRAINT "RevisionEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionEvent" ADD CONSTRAINT "RevisionEvent_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_resultSnapshotId_fkey" FOREIGN KEY ("resultSnapshotId") REFERENCES "BriefSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
