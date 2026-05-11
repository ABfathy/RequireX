import { prisma } from "@/lib/prisma";
import type { SourceBundleChunk } from "@/server/services/google-genai";
import { generateBriefFromBundle } from "@/server/services/google-genai";
import { normalizeTextToChunks } from "@/server/services/source-normalization";
import type {
  GeneratedBrief,
  GeneratedBriefEvidence,
} from "@/server/validators/brief-generation";

import type {
  BriefClaimSection,
  BriefQuestionSection,
  Prisma,
  SourceChunk,
  SourceType,
} from "../../../generated/prisma/client";

export class BriefPipelineError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BriefPipelineError";
  }
}

type RunTextBriefGenerationInput = {
  jobId: string;
  sessionId: string;
  requestedBy: string;
  sourceSnapshotId?: string;
};

type ChunkWithAsset = SourceChunk & {
  sourceAsset: {
    id: string;
    sourceType: SourceType;
    displayLabel: string | null;
    originalFileName: string | null;
  };
};

type GeneratedItem = {
  text: string;
  evidence: GeneratedBriefEvidence[];
};

function truncateExcerpt(text: string) {
  return text.trim().slice(0, 500);
}

function sourceLabel(chunk: ChunkWithAsset) {
  return (
    chunk.sourceAsset.displayLabel ??
    chunk.sourceAsset.originalFileName ??
    chunk.chunkLabel ??
    "Source"
  );
}

function buildSourceBundle(chunks: ChunkWithAsset[]) {
  return {
    chunks: chunks.map<SourceBundleChunk>((chunk) => ({
      id: chunk.id,
      label: chunk.chunkLabel ?? `Chunk ${chunk.orderIndex + 1}`,
      sourceLabel: sourceLabel(chunk),
      text: chunk.text,
    })),
  };
}

function resolveEvidence(
  item: GeneratedItem,
  chunksById: Map<string, ChunkWithAsset>,
  fallbackChunk: ChunkWithAsset,
) {
  const validEvidence = item.evidence
    .map((evidence) => {
      const chunk = chunksById.get(evidence.sourceChunkId);
      if (!chunk) {
        return null;
      }

      return {
        chunk,
        label:
          evidence.label ??
          chunk.chunkLabel ??
          `${sourceLabel(chunk)} #${chunk.orderIndex + 1}`,
        excerpt: truncateExcerpt(evidence.excerpt ?? chunk.text),
      };
    })
    .filter(
      (
        evidence,
      ): evidence is {
        chunk: ChunkWithAsset;
        label: string;
        excerpt: string;
      } => Boolean(evidence),
    );

  if (validEvidence.length > 0) {
    return validEvidence;
  }

  return [
    {
      chunk: fallbackChunk,
      label: fallbackChunk.chunkLabel ?? sourceLabel(fallbackChunk),
      excerpt: truncateExcerpt(fallbackChunk.text),
    },
  ];
}

async function ensureTextChunks(sessionId: string) {
  const textAssets = await prisma.sourceAsset.findMany({
    where: {
      sessionId,
      sourceType: "TEXT",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      status: true,
      textContent: true,
    },
  });

  if (textAssets.length === 0) {
    throw new BriefPipelineError(
      "NO_TEXT_SOURCES",
      "At least one pasted text source is required for text-first generation.",
    );
  }

  for (const asset of textAssets) {
    const existingChunks = await prisma.sourceChunk.findMany({
      where: {
        sourceAssetId: asset.id,
      },
      select: {
        id: true,
      },
    });

    if (existingChunks.length > 0) {
      await prisma.sourceAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });
      continue;
    }

    const normalizedChunks = normalizeTextToChunks(asset.textContent ?? "");
    if (normalizedChunks.length === 0) {
      await prisma.sourceAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          status: "FAILED",
          errorMessage: "Text source had no usable content to process.",
        },
      });
      throw new BriefPipelineError(
        "EMPTY_TEXT_SOURCE",
        "A text source had no usable content to process.",
      );
    }

    await prisma.sourceAsset.update({
      where: {
        id: asset.id,
      },
      data: {
        status: "QUEUED",
        errorMessage: null,
      },
    });

    await prisma.sourceAsset.update({
      where: {
        id: asset.id,
      },
      data: {
        status: "PROCESSING",
      },
    });

    await prisma.sourceChunk.createMany({
      data: normalizedChunks.map((chunk) => ({
        sourceAssetId: asset.id,
        kind: chunk.kind,
        orderIndex: chunk.orderIndex,
        text: chunk.text,
        locator: chunk.locator,
        chunkLabel: chunk.chunkLabel,
      })),
    });

    await prisma.sourceAsset.update({
      where: {
        id: asset.id,
      },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  }

  return prisma.sourceChunk.findMany({
    where: {
      sourceAsset: {
        sessionId,
        sourceType: "TEXT",
      },
    },
    include: {
      sourceAsset: {
        select: {
          id: true,
          sourceType: true,
          displayLabel: true,
          originalFileName: true,
        },
      },
    },
    orderBy: [
      {
        sourceAsset: {
          createdAt: "asc",
        },
      },
      {
        orderIndex: "asc",
      },
    ],
  });
}

async function createEvidenceRefs(
  tx: Prisma.TransactionClient,
  input: {
    snapshotId: string;
    item: GeneratedItem;
    chunksById: Map<string, ChunkWithAsset>;
    fallbackChunk: ChunkWithAsset;
    claimId?: string;
    questionId?: string;
  },
) {
  const evidenceRefs = resolveEvidence(
    input.item,
    input.chunksById,
    input.fallbackChunk,
  );

  for (const evidence of evidenceRefs) {
    await tx.evidenceRef.create({
      data: {
        snapshotId: input.snapshotId,
        sourceAssetId: evidence.chunk.sourceAssetId,
        sourceChunkId: evidence.chunk.id,
        claimId: input.claimId,
        questionId: input.questionId,
        sourceType: evidence.chunk.sourceAsset.sourceType,
        label: evidence.label,
        locator: (evidence.chunk.locator ?? {}) as Prisma.InputJsonValue,
        excerpt: evidence.excerpt,
      },
    });
  }
}

async function createClaims(
  tx: Prisma.TransactionClient,
  input: {
    snapshotId: string;
    section: BriefClaimSection;
    items: GeneratedBrief["summary"];
    chunksById: Map<string, ChunkWithAsset>;
    fallbackChunk: ChunkWithAsset;
  },
) {
  for (const [orderIndex, item] of input.items.entries()) {
    const claim = await tx.briefClaim.create({
      data: {
        snapshotId: input.snapshotId,
        section: input.section,
        orderIndex,
        text: item.text,
        confidence: item.confidence,
      },
    });

    await createEvidenceRefs(tx, {
      snapshotId: input.snapshotId,
      item,
      chunksById: input.chunksById,
      fallbackChunk: input.fallbackChunk,
      claimId: claim.id,
    });
  }
}

async function createQuestions(
  tx: Prisma.TransactionClient,
  input: {
    snapshotId: string;
    section: BriefQuestionSection;
    items: GeneratedBrief["ambiguities"];
    chunksById: Map<string, ChunkWithAsset>;
    fallbackChunk: ChunkWithAsset;
  },
) {
  for (const [orderIndex, item] of input.items.entries()) {
    const question = await tx.briefQuestion.create({
      data: {
        snapshotId: input.snapshotId,
        section: input.section,
        orderIndex,
        text: item.text,
        reason: item.reason,
      },
    });

    await createEvidenceRefs(tx, {
      snapshotId: input.snapshotId,
      item,
      chunksById: input.chunksById,
      fallbackChunk: input.fallbackChunk,
      questionId: question.id,
    });
  }
}

export async function runTextBriefGeneration({
  jobId,
  sessionId,
  requestedBy,
  sourceSnapshotId,
}: RunTextBriefGenerationInput) {
  const session = await prisma.intakeSession.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      id: true,
      projectId: true,
    },
  });

  if (!session) {
    throw new BriefPipelineError(
      "SESSION_NOT_FOUND",
      "Intake session was not found.",
    );
  }

  if (sourceSnapshotId) {
    const sourceSnapshot = await prisma.briefSnapshot.findFirst({
      where: {
        id: sourceSnapshotId,
        sessionId,
      },
      select: {
        id: true,
      },
    });

    if (!sourceSnapshot) {
      throw new BriefPipelineError(
        "SOURCE_SNAPSHOT_NOT_FOUND",
        "Source brief snapshot was not found for this intake session.",
      );
    }
  }

  const chunks = await ensureTextChunks(sessionId);
  if (chunks.length === 0) {
    throw new BriefPipelineError(
      "NO_SOURCE_CHUNKS",
      "Text sources did not produce any source chunks.",
    );
  }

  const bundle = buildSourceBundle(chunks);
  const generatedBrief = await generateBriefFromBundle(bundle);
  const chunksById = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const fallbackChunk = chunks[0];

  if (!fallbackChunk) {
    throw new BriefPipelineError(
      "NO_SOURCE_CHUNKS",
      "Text sources did not produce any source chunks.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const latest = await tx.briefSnapshot.aggregate({
      where: {
        sessionId,
      },
      _max: {
        version: true,
      },
    });
    const version = (latest._max.version ?? 0) + 1;

    const snapshot = await tx.briefSnapshot.create({
      data: {
        projectId: session.projectId,
        sessionId,
        version,
        status: "DRAFT",
        sourceBundleVersion: version,
        createdBy: requestedBy,
      },
    });

    await createClaims(tx, {
      snapshotId: snapshot.id,
      section: "SUMMARY",
      items: generatedBrief.summary,
      chunksById,
      fallbackChunk,
    });
    await createClaims(tx, {
      snapshotId: snapshot.id,
      section: "GOALS",
      items: generatedBrief.goals,
      chunksById,
      fallbackChunk,
    });
    await createQuestions(tx, {
      snapshotId: snapshot.id,
      section: "AMBIGUITIES",
      items: generatedBrief.ambiguities,
      chunksById,
      fallbackChunk,
    });
    await createQuestions(tx, {
      snapshotId: snapshot.id,
      section: "FOLLOW_UP_QUESTIONS",
      items: generatedBrief.followUpQuestions,
      chunksById,
      fallbackChunk,
    });

    await tx.revisionEvent.create({
      data: {
        projectId: session.projectId,
        sessionId,
        snapshotId: snapshot.id,
        type: sourceSnapshotId ? "REGENERATED" : "GENERATED",
        actorType: "INTERNAL_USER",
        actorId: requestedBy,
        summary: sourceSnapshotId
          ? `Regenerated brief snapshot v${version}.`
          : `Generated brief snapshot v${version}.`,
        metadata: {
          sourceSnapshotId: sourceSnapshotId ?? null,
          sourceChunkCount: chunks.length,
        },
      },
    });

    await tx.processingJob.update({
      where: {
        id: jobId,
      },
      data: {
        status: "SUCCEEDED",
        resultSnapshotId: snapshot.id,
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });

    await tx.intakeSession.update({
      where: {
        id: sessionId,
      },
      data: {
        status: "REVIEW_READY",
        lastActivityAt: new Date(),
      },
    });

    return snapshot;
  });
}
