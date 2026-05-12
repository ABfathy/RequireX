import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import {
  extractJson,
  generateBriefFromBundle,
  generateBriefStreamFromBundle,
  GoogleGenAIConfigError,
  type SourceBundle,
} from "@/server/services/google-genai";
import { normalizeTextToChunks } from "@/server/services/source-normalization";
import { BriefOutputSchema } from "@/server/validators/brief-output";
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

function logBriefPipeline(
  level: "info" | "warn" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  const payload = {
    scope: "brief-pipeline",
    message,
    ...details,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

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

export type TextAssetWithChunks = SourceAsset & {
  chunks: SourceChunk[];
};

export function pipelineErrorFromUnknown(error: unknown) {
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
  logBriefPipeline("error", "Marking job as failed.", {
    jobId,
    errorCode: pipelineError.code,
    errorMessage: pipelineError.message,
  });
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

export async function loadTextAssets(sessionId: string) {
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

export async function ensureTextChunks(assets: TextAssetWithChunks[]) {
  logBriefPipeline("info", "Ensuring text chunks exist.", {
    sessionId: assets[0]?.sessionId ?? null,
    assetCount: assets.length,
  });

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

export function textForPrompt(asset: TextAssetWithChunks) {
  if (asset.textContent?.trim()) return asset.textContent.trim();
  return asset.chunks.map((chunk) => chunk.text).join("\n\n").trim();
}

export function buildSourceBundle(assets: TextAssetWithChunks[]): SourceBundle {
  const bodies = assets
    .map((asset) => ({
      asset,
      body: textForPrompt(asset),
      label: assetLabel(asset),
    }))
    .filter((e) => e.body.length > 0);

  if (bodies.length === 0) return { assets: [] };

  // First pass: give each source an equal share of the budget.
  const perSource = Math.floor(PROMPT_BUNDLE_MAX_CHARS / bodies.length);
  const allocations = bodies.map(({ body }) => Math.min(body.length, perSource));

  // Second pass: redistribute unused budget from short sources to longer ones.
  const surplus = allocations.reduce(
    (acc, alloc) => acc + (perSource - alloc),
    0,
  );
  if (surplus > 0) {
    const needMoreCount = bodies.filter((e, i) => e.body.length > (allocations[i] ?? 0)).length;
    if (needMoreCount > 0) {
      const extra = Math.floor(surplus / needMoreCount);
      for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i]?.body ?? "";
        const current = allocations[i] ?? 0;
        if (body.length > current) {
          allocations[i] = Math.min(body.length, current + extra);
        }
      }
    }
  }

  return {
    assets: bodies.map(({ asset, body, label }, i) => ({
      id: asset.id,
      label,
      text: body.slice(0, allocations[i]),
    })),
  };
}

async function callModelWithRetry(bundle: SourceBundle) {
  try {
    logBriefPipeline("info", "Calling Gemini for brief generation.", {
      sourceAssetCount: bundle.assets.length,
      promptChars: bundle.assets.reduce((sum, asset) => sum + asset.text.length, 0),
      retry: false,
    });
    return await generateBriefFromBundle(bundle);
  } catch (error) {
    const firstError = pipelineErrorFromUnknown(error);
    logBriefPipeline("warn", "Initial Gemini call failed.", {
      errorCode: firstError.code,
      errorMessage: firstError.message,
    });
    if (firstError.code !== "INVALID_MODEL_OUTPUT") {
      throw firstError;
    }

    try {
      logBriefPipeline("info", "Retrying Gemini after invalid output.", {
        sourceAssetCount: bundle.assets.length,
        retry: true,
      });
      return await generateBriefFromBundle(bundle, firstError.message);
    } catch (retryError) {
      throw pipelineErrorFromUnknown(retryError);
    }
  }
}

export type PersistSnapshotInput = {
  projectId: string;
  sessionId: string;
  requestedBy: string;
  output: BriefOutput;
  assets: TextAssetWithChunks[];
  revisionEvent?: {
    type: "GENERATED" | "REGENERATED";
    actorType: "SYSTEM" | "INTERNAL_USER";
    summary: string;
    metadata: Record<string, unknown>;
  };
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

export async function persistSnapshot({
  projectId,
  sessionId,
  requestedBy,
  output,
  assets,
  revisionEvent,
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

    const evt = revisionEvent ?? {
      type: "GENERATED" as const,
      actorType: "SYSTEM" as const,
      summary: `Generated brief snapshot v${version}.`,
      metadata: { sourceAssetCount: assets.length },
    };
    await tx.revisionEvent.create({
      data: {
        projectId,
        sessionId,
        snapshotId: snapshot.id,
        type: evt.type,
        actorType: evt.actorType,
        actorId: requestedBy,
        summary: evt.summary,
        metadata: evt.metadata as Prisma.InputJsonValue,
      },
    });

    await tx.intakeSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEW_READY",
        lastActivityAt: new Date(),
      },
    });

    logBriefPipeline("info", "Persisted generated snapshot.", {
      projectId,
      sessionId,
      snapshotId: snapshot.id,
      version: snapshot.version,
      claimCount: output.summary.length + output.goals.length,
      questionCount: output.ambiguities.length + output.followUpQuestions.length,
    });

    return snapshot;
  });
}

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "complete"; snapshotId: string; version: number }
  | { type: "error"; code: string; message: string };

export async function* runBriefGenerationStream(
  input: RunBriefGenerationInput,
): AsyncGenerator<StreamEvent> {
  await prisma.processingJob.update({
    where: { id: input.jobId },
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
      where: { id: input.sessionId },
      select: { id: true, projectId: true },
    });

    if (!session) {
      throw new BriefPipelineError("SESSION_NOT_FOUND", "Intake session was not found.");
    }

    const initialAssets = await loadTextAssets(input.sessionId);
    const assetsWithText = initialAssets.filter((asset) => textForPrompt(asset).trim());

    if (assetsWithText.length === 0) {
      throw new BriefPipelineError("NO_SOURCES", "No text sources are available for this session.");
    }

    const assets = await ensureTextChunks(assetsWithText);
    const bundle = buildSourceBundle(assets);
    if (bundle.assets.length === 0) {
      throw new BriefPipelineError("EMPTY_BUNDLE", "Source bundle was empty after assembly.");
    }

    let fullText = "";
    try {
      for await (const chunk of generateBriefStreamFromBundle(bundle)) {
        fullText += chunk;
        yield { type: "token", text: chunk };
      }
    } catch (streamError) {
      throw pipelineErrorFromUnknown(streamError);
    }

    let output: BriefOutput;
    try {
      output = BriefOutputSchema.parse(extractJson(fullText));
    } catch (parseError) {
      logBriefPipeline("warn", "Stream output invalid, retrying non-streaming.", {
        jobId: input.jobId,
        errorMessage: parseError instanceof Error ? parseError.message : "Parse failed.",
      });
      const hint = pipelineErrorFromUnknown(parseError).message;
      try {
        output = await generateBriefFromBundle(bundle, hint);
      } catch (retryError) {
        throw pipelineErrorFromUnknown(retryError);
      }
    }

    const snapshot = await persistSnapshot({
      projectId: session.projectId,
      sessionId: input.sessionId,
      requestedBy: input.requestedBy,
      output,
      assets,
    });

    await prisma.processingJob.update({
      where: { id: input.jobId },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        resultSnapshotId: snapshot.id,
        errorCode: null,
        errorMessage: null,
      },
    });

    logBriefPipeline("info", "Completed streaming brief generation.", {
      jobId: input.jobId,
      sessionId: input.sessionId,
      snapshotId: snapshot.id,
      version: snapshot.version,
    });

    yield { type: "complete", snapshotId: snapshot.id, version: snapshot.version };
  } catch (error) {
    const pipelineError = await markJobFailed(input.jobId, error);
    yield { type: "error", code: pipelineError.code, message: pipelineError.message };
  }
}

export async function runBriefGeneration({
  jobId,
  sessionId,
  requestedBy,
}: RunBriefGenerationInput) {
  logBriefPipeline("info", "Starting brief generation run.", {
    jobId,
    sessionId,
    requestedBy,
  });

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

    logBriefPipeline("info", "Loaded text assets for generation.", {
      jobId,
      sessionId,
      totalAssets: initialAssets.length,
      usableTextAssets: assetsWithText.length,
    });

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

    logBriefPipeline("info", "Completed brief generation run.", {
      jobId,
      sessionId,
      snapshotId: snapshot.id,
      version: snapshot.version,
      status: "SUCCEEDED",
    });

    return { snapshotId: snapshot.id, version: snapshot.version };
  } catch (error) {
    const pipelineError = await markJobFailed(jobId, error);
    throw pipelineError;
  }
}
