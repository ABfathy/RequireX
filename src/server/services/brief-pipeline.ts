import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import {
  generateBriefFromBundle,
  GoogleGenAIConfigError,
  type SourceBundle,
} from "@/server/services/google-genai";
import { normalizeTextToChunks } from "@/server/services/source-normalization";
import type {
  BriefClaimOutput,
  BriefEvidenceOutput,
  BriefOutput,
  BriefQuestionOutput,
} from "@/server/validators/brief-output";

import type {
  BriefClaimSection,
  BriefQuestionSection,
  Prisma,
  SourceAsset,
  SourceChunk,
} from "../../../generated/prisma/client";

const PROMPT_BUNDLE_MAX_CHARS = 30_000;

export class BriefPipelineError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BriefPipelineError";
  }
}

type RunBriefGenerationInput = {
  jobId: string;
  sessionId: string;
  requestedBy: string;
};

type TextAssetWithChunks = SourceAsset & {
  chunks: SourceChunk[];
};

function pipelineErrorFromUnknown(error: unknown) {
  if (error instanceof BriefPipelineError) return error;
  if (error instanceof GoogleGenAIConfigError) {
    return new BriefPipelineError(error.code, error.message);
  }
  if (error instanceof ZodError) {
    const issues = error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    return new BriefPipelineError(
      "INVALID_MODEL_OUTPUT",
      `Model output did not match schema: ${issues}`,
    );
  }
  if (error instanceof SyntaxError) {
    return new BriefPipelineError("INVALID_MODEL_OUTPUT", error.message);
  }
  if (error instanceof Error) {
    return new BriefPipelineError("VERTEX_CALL_FAILED", error.message);
  }
  return new BriefPipelineError(
    "PIPELINE_FAILED",
    "Brief generation failed.",
  );
}

async function markJobFailed(jobId: string, error: unknown) {
  const pipelineError = pipelineErrorFromUnknown(error);
  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode: pipelineError.code,
      errorMessage: pipelineError.message,
    },
  });
  return pipelineError;
}

async function loadTextAssets(sessionId: string) {
  return prisma.sourceAsset.findMany({
    where: {
      sessionId,
      sourceType: "TEXT",
      status: { in: ["UPLOADED", "PROCESSED"] },
    },
    include: {
      chunks: {
        orderBy: { orderIndex: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

async function ensureTextChunks(assets: TextAssetWithChunks[]) {
  for (const asset of assets) {
    if (asset.chunks.length > 0) continue;

    const normalizedChunks = normalizeTextToChunks(asset.textContent ?? "");
    if (normalizedChunks.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_TEXT_SOURCE",
        "A text source had no usable content to process.",
      );
    }

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
      where: { id: asset.id },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  return loadTextAssets(assets[0]?.sessionId ?? "");
}

function assetLabel(asset: TextAssetWithChunks) {
  return asset.displayLabel ?? asset.originalFileName ?? "Untitled source";
}

function textForPrompt(asset: TextAssetWithChunks) {
  if (asset.textContent?.trim()) return asset.textContent.trim();
  return asset.chunks.map((chunk) => chunk.text).join("\n\n").trim();
}

function buildSourceBundle(assets: TextAssetWithChunks[]): SourceBundle {
  const bundleAssets: SourceBundle["assets"] = [];
  let used = 0;

  for (const asset of assets) {
    const body = textForPrompt(asset);
    if (!body) continue;

    const label = assetLabel(asset);
    const blockOverhead = `[SOURCE id="${asset.id}" label="${label}"]\n\n[/SOURCE]\n\n`
      .length;
    const remaining = PROMPT_BUNDLE_MAX_CHARS - used - blockOverhead;
    if (remaining <= 0) break;

    const text = body.slice(0, remaining);
    bundleAssets.push({
      id: asset.id,
      label,
      text,
    });
    used += blockOverhead + text.length;
  }

  return { assets: bundleAssets };
}

async function callModelWithRetry(bundle: SourceBundle) {
  try {
    return await generateBriefFromBundle(bundle);
  } catch (error) {
    const firstError = pipelineErrorFromUnknown(error);
    if (firstError.code !== "INVALID_MODEL_OUTPUT") {
      throw firstError;
    }

    try {
      return await generateBriefFromBundle(bundle, firstError.message);
    } catch (retryError) {
      throw pipelineErrorFromUnknown(retryError);
    }
  }
}

type PersistSnapshotInput = {
  projectId: string;
  sessionId: string;
  requestedBy: string;
  output: BriefOutput;
  assets: TextAssetWithChunks[];
};

function firstChunkByAssetId(assets: TextAssetWithChunks[]) {
  const map = new Map<string, SourceChunk>();
  for (const asset of assets) {
    const firstChunk = asset.chunks[0];
    if (firstChunk) map.set(asset.id, firstChunk);
  }
  return map;
}

function buildEvidenceRows(input: {
  snapshotId: string;
  claimId?: string;
  questionId?: string;
  evidence: BriefEvidenceOutput[];
  assetById: Map<string, TextAssetWithChunks>;
  chunkByAssetId: Map<string, SourceChunk>;
}) {
  return input.evidence
    .map((evidence) => {
      const asset = input.assetById.get(evidence.sourceAssetId);
      const chunk = input.chunkByAssetId.get(evidence.sourceAssetId);
      if (!asset || !chunk) return null;

      return {
        snapshotId: input.snapshotId,
        sourceAssetId: asset.id,
        sourceChunkId: chunk.id,
        claimId: input.claimId,
        questionId: input.questionId,
        sourceType: asset.sourceType,
        label: assetLabel(asset),
        locator: chunk.locator as Prisma.InputJsonValue,
        excerpt: evidence.excerpt.trim().slice(0, 500),
      };
    })
    .filter(<T>(row: T | null): row is T => row !== null);
}

async function persistSnapshot({
  projectId,
  sessionId,
  requestedBy,
  output,
  assets,
}: PersistSnapshotInput) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const chunkByAssetId = firstChunkByAssetId(assets);

  return prisma.$transaction(async (tx) => {
    const latest = await tx.briefSnapshot.aggregate({
      where: { sessionId },
      _max: { version: true },
    });
    const version = (latest._max.version ?? 0) + 1;

    const snapshot = await tx.briefSnapshot.create({
      data: {
        projectId,
        sessionId,
        version,
        status: "DRAFT",
        sourceBundleVersion: version,
        createdBy: requestedBy,
      },
    });

    async function insertClaims(
      section: BriefClaimSection,
      claims: BriefClaimOutput[],
    ) {
      for (const [orderIndex, item] of claims.entries()) {
        const claim = await tx.briefClaim.create({
          data: {
            snapshotId: snapshot.id,
            section,
            orderIndex,
            text: item.text,
            confidence: item.confidence,
          },
        });
        const rows = buildEvidenceRows({
          snapshotId: snapshot.id,
          claimId: claim.id,
          evidence: item.evidence,
          assetById,
          chunkByAssetId,
        });
        if (rows.length > 0) {
          await tx.evidenceRef.createMany({ data: rows });
        }
      }
    }

    async function insertQuestions(
      section: BriefQuestionSection,
      questions: BriefQuestionOutput[],
    ) {
      for (const [orderIndex, item] of questions.entries()) {
        const question = await tx.briefQuestion.create({
          data: {
            snapshotId: snapshot.id,
            section,
            orderIndex,
            text: item.text,
            reason: item.reason,
          },
        });
        const rows = buildEvidenceRows({
          snapshotId: snapshot.id,
          questionId: question.id,
          evidence: item.evidence,
          assetById,
          chunkByAssetId,
        });
        if (rows.length > 0) {
          await tx.evidenceRef.createMany({ data: rows });
        }
      }
    }

    await insertClaims("SUMMARY", output.summary);
    await insertClaims("GOALS", output.goals);
    await insertQuestions("AMBIGUITIES", output.ambiguities);
    await insertQuestions("FOLLOW_UP_QUESTIONS", output.followUpQuestions);

    await tx.revisionEvent.create({
      data: {
        projectId,
        sessionId,
        snapshotId: snapshot.id,
        type: "GENERATED",
        actorType: "SYSTEM",
        actorId: requestedBy,
        summary: `Generated brief snapshot v${version}.`,
        metadata: {
          sourceAssetCount: assets.length,
        },
      },
    });

    await tx.intakeSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEW_READY",
        lastActivityAt: new Date(),
      },
    });

    return snapshot;
  });
}

export async function runBriefGeneration({
  jobId,
  sessionId,
  requestedBy,
}: RunBriefGenerationInput) {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      attemptCount: { increment: 1 },
      errorCode: null,
      errorMessage: null,
    },
  });

  try {
    const session = await prisma.intakeSession.findUnique({
      where: { id: sessionId },
      select: { id: true, projectId: true },
    });

    if (!session) {
      throw new BriefPipelineError(
        "SESSION_NOT_FOUND",
        "Intake session was not found.",
      );
    }

    const initialAssets = await loadTextAssets(sessionId);
    const assetsWithText = initialAssets.filter((asset) =>
      textForPrompt(asset).trim(),
    );

    if (assetsWithText.length === 0) {
      throw new BriefPipelineError(
        "NO_SOURCES",
        "No text sources are available for this session.",
      );
    }

    const assets = await ensureTextChunks(assetsWithText);
    const bundle = buildSourceBundle(assets);
    if (bundle.assets.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_BUNDLE",
        "Source bundle was empty after assembly.",
      );
    }

    const output = await callModelWithRetry(bundle);
    const snapshot = await persistSnapshot({
      projectId: session.projectId,
      sessionId,
      requestedBy,
      output,
      assets,
    });

    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        resultSnapshotId: snapshot.id,
        errorCode: null,
        errorMessage: null,
      },
    });

    return { snapshotId: snapshot.id, version: snapshot.version };
  } catch (error) {
    const pipelineError = await markJobFailed(jobId, error);
    throw pipelineError;
  }
}
