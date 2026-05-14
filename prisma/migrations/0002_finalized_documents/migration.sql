-- CreateEnum
CREATE TYPE "BriefDocumentType" AS ENUM ('GENERATED_BRIEF', 'FINALIZED_DOCUMENT');

-- AlterEnum
ALTER TYPE "BriefClaimSection" ADD VALUE 'PROJECT_OVERVIEW';
ALTER TYPE "BriefClaimSection" ADD VALUE 'PROJECT_GOALS';
ALTER TYPE "BriefClaimSection" ADD VALUE 'MAIN_FEATURES';
ALTER TYPE "BriefClaimSection" ADD VALUE 'FUNCTIONAL_REQUIREMENTS';
ALTER TYPE "BriefClaimSection" ADD VALUE 'NON_FUNCTIONAL_REQUIREMENTS';
ALTER TYPE "BriefClaimSection" ADD VALUE 'USER_FLOWS';

-- AlterEnum
ALTER TYPE "BriefCommentSection" ADD VALUE 'PROJECT_OVERVIEW';
ALTER TYPE "BriefCommentSection" ADD VALUE 'PROJECT_GOALS';
ALTER TYPE "BriefCommentSection" ADD VALUE 'MAIN_FEATURES';
ALTER TYPE "BriefCommentSection" ADD VALUE 'FUNCTIONAL_REQUIREMENTS';
ALTER TYPE "BriefCommentSection" ADD VALUE 'NON_FUNCTIONAL_REQUIREMENTS';
ALTER TYPE "BriefCommentSection" ADD VALUE 'USER_FLOWS';

-- AlterTable
ALTER TABLE "BriefSnapshot" ADD COLUMN "documentType" "BriefDocumentType" NOT NULL DEFAULT 'GENERATED_BRIEF';

-- Re-scope snapshot versions by document type.
DROP INDEX "BriefSnapshot_sessionId_version_key";
CREATE UNIQUE INDEX "BriefSnapshot_sessionId_documentType_version_key" ON "BriefSnapshot"("sessionId", "documentType", "version");
CREATE INDEX "BriefSnapshot_sessionId_documentType_createdAt_idx" ON "BriefSnapshot"("sessionId", "documentType", "createdAt");
