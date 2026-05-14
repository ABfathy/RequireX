import { prisma } from "@/lib/prisma";
import {
  type FinalizedBriefVersion,
  generateFinalizedDocumentFromBriefs,
} from "@/server/services/google-genai";
import {
  type BriefClaimOutput,
  type FinalizedDocumentOutput,
} from "@/server/validators/brief-output";

import type {
  BriefClaimSection,
  Prisma,
} from "../../../generated/prisma/client";

const FINALIZED_PERSIST_TRANSACTION_TIMEOUT_MS = 20_000;
const FINALIZED_PERSIST_TRANSACTION_MAX_WAIT_MS = 10_000;

export class FinalizedDocumentGenerationError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "FINALIZED_DOCUMENT_FAILED",
  ) {
    super(message);
    this.name = "FinalizedDocumentGenerationError";
  }
}

const FINALIZED_SECTION_MAP = {
  projectOverview: "PROJECT_OVERVIEW",
  projectGoals: "PROJECT_GOALS",
  mainFeatures: "MAIN_FEATURES",
  functionalRequirements: "FUNCTIONAL_REQUIREMENTS",
  nonFunctionalRequirements: "NON_FUNCTIONAL_REQUIREMENTS",
  userFlows: "USER_FLOWS",
} satisfies Record<keyof FinalizedDocumentOutput, BriefClaimSection>;

function finalizedErrorFromUnknown(error: unknown) {
  if (error instanceof FinalizedDocumentGenerationError) return error;
  if (error instanceof Error) {
    return new FinalizedDocumentGenerationError(
      error.message,
      500,
      "FINALIZED_MODEL_FAILED",
    );
  }
  return new FinalizedDocumentGenerationError(
    "Finalized document generation failed.",
    500,
    "FINALIZED_DOCUMENT_FAILED",
  );
}

function briefVersionForPrompt(brief: {
  version: number;
  claims: Array<{ section: string; text: string; confidence: string }>;
  questions: Array<{
    section: string;
    text: string;
    reason: string;
    status: string;
  }>;
}): FinalizedBriefVersion {
  return {
    version: brief.version,
    claims: brief.claims,
    questions: brief.questions,
  };
}

async function generateWithRetry(briefVersions: FinalizedBriefVersion[]) {
  try {
    return await generateFinalizedDocumentFromBriefs(briefVersions);
  } catch (error) {
    const firstError = finalizedErrorFromUnknown(error);
    try {
      return await generateFinalizedDocumentFromBriefs(
        briefVersions,
        firstError.message,
      );
    } catch (retryError) {
      throw finalizedErrorFromUnknown(retryError);
    }
  }
}

export async function createFinalizedDocument({
  sessionId,
  requestedBy,
}: {
  sessionId: string;
  requestedBy: string;
}) {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, projectId: true },
  });

  if (!session) {
    throw new FinalizedDocumentGenerationError(
      "Intake session was not found.",
      404,
      "SESSION_NOT_FOUND",
    );
  }

  const sourceBriefs = await prisma.briefSnapshot.findMany({
    where: {
      sessionId,
      documentType: "GENERATED_BRIEF",
    },
    orderBy: { version: "desc" },
    take: 3,
    select: {
      id: true,
      version: true,
      claims: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        select: { section: true, text: true, confidence: true },
      },
      questions: {
        orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        select: { section: true, text: true, reason: true, status: true },
      },
    },
  });

  if (sourceBriefs.length === 0) {
    throw new FinalizedDocumentGenerationError(
      "Create at least one generated brief before creating a finalized document.",
      409,
      "NO_GENERATED_BRIEFS",
    );
  }

  const briefVersions = sourceBriefs
    .slice()
    .reverse()
    .map(briefVersionForPrompt);
  const output = await generateWithRetry(briefVersions);

  return prisma.$transaction(
    async (tx) => {
      const latest = await tx.briefSnapshot.aggregate({
        where: { sessionId, documentType: "FINALIZED_DOCUMENT" },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;

      const latestSourceBriefVersion = sourceBriefs[0]?.version ?? version;
      const snapshot = await tx.briefSnapshot.create({
        data: {
          projectId: session.projectId,
          sessionId,
          version,
          documentType: "FINALIZED_DOCUMENT",
          status: "DRAFT",
          sourceBundleVersion: latestSourceBriefVersion,
          createdBy: requestedBy,
        },
      });

      const claimRows = (
        Object.entries(FINALIZED_SECTION_MAP) as Array<
          [keyof FinalizedDocumentOutput, BriefClaimSection]
        >
      ).flatMap(([key, section]) =>
        output[key].map((item: BriefClaimOutput, orderIndex) => ({
          snapshotId: snapshot.id,
          section,
          orderIndex,
          text: item.text,
          confidence: item.confidence,
        })),
      );

      if (claimRows.length > 0) {
        await tx.briefClaim.createMany({ data: claimRows });
      }

      await tx.revisionEvent.create({
        data: {
          projectId: session.projectId,
          sessionId,
          snapshotId: snapshot.id,
          type: "GENERATED",
          actorType: "INTERNAL_USER",
          actorId: requestedBy,
          summary: `Generated finalized document v${version}.`,
          metadata: {
            documentType: "FINALIZED_DOCUMENT",
            sourceBriefSnapshotIds: sourceBriefs.map((brief) => brief.id),
            sourceBriefVersions: sourceBriefs.map((brief) => brief.version),
          } as Prisma.InputJsonValue,
        },
      });

      await tx.intakeSession.update({
        where: { id: sessionId },
        data: {
          status: "REVIEW_READY",
          lastActivityAt: new Date(),
        },
      });

      return {
        snapshotId: snapshot.id,
        version: snapshot.version,
        documentType: snapshot.documentType,
      };
    },
    {
      maxWait: FINALIZED_PERSIST_TRANSACTION_MAX_WAIT_MS,
      timeout: FINALIZED_PERSIST_TRANSACTION_TIMEOUT_MS,
    },
  );
}
