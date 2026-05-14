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
import {
  normalizeSourceTextToChunks,
  processSessionFileSources,
} from "@/server/services/source-processing";
import type {
  BriefEvidenceOutput,
  BriefOutput,
} from "@/server/validators/brief-output";
import { BriefOutputSchema } from "@/server/validators/brief-output";

import type {
  BriefDocumentType,
  Prisma,
  SourceAsset,
  SourceChunk,
} from "../../../generated/prisma/client";

/**
 * Maximum characters taken from a single source asset when building the
 * prompt bundle.  Defaults to 750 000 — comfortably inside Gemini 2.5
 * Flash's 1 M-token context window — so the full content of every source
 * is sent and no requirements are silently dropped.
 *
 * Override via env var when needed:
 *   PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE=500000
 */
const parsedEnv = process.env.PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE
  ? parseInt(process.env.PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE, 10)
  : NaN;

const PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE = isNaN(parsedEnv)
  ? 750_000
  : Math.max(1_000, parsedEnv);
const SNAPSHOT_PERSIST_TRANSACTION_TIMEOUT_MS = 20_000;
const SNAPSHOT_PERSIST_TRANSACTION_MAX_WAIT_MS = 10_000;

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
  processFileSources?: boolean;
};

export type PromptAssetWithChunks = SourceAsset & {
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
  return new BriefPipelineError("PIPELINE_FAILED", "Brief generation failed.");
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

function assertBriefOutputHasContent(output: BriefOutput) {
  const itemCount =
    output.summary.length +
    output.goals.length +
    output.ambiguities.length +
    output.followUpQuestions.length;

  if (itemCount === 0) {
    throw new BriefPipelineError(
      "INVALID_MODEL_OUTPUT",
      "Model returned an empty brief. Return at least one summary, goal, ambiguity, or follow-up question grounded in the provided sources.",
    );
  }

  return output;
}

export async function loadPromptSourceAssets(sessionId: string) {
  return prisma.sourceAsset.findMany({
    where: {
      sessionId,
      sourceType: { in: ["TEXT", "PDF", "AUDIO", "IMAGE"] },
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

export async function ensureSourceChunks(assets: PromptAssetWithChunks[]) {
  logBriefPipeline("info", "Ensuring source chunks exist.", {
    sessionId: assets[0]?.sessionId ?? null,
    assetCount: assets.length,
  });

  for (const asset of assets) {
    if (asset.chunks.length > 0) continue;

    const normalizedChunks =
      asset.sourceType === "IMAGE"
        ? [imageSourceChunk(asset)]
        : asset.sourceType === "TEXT"
          ? normalizeTextToChunks(asset.textContent ?? "")
          : normalizeSourceTextToChunks({
              sourceType: asset.sourceType,
              text: asset.textContent ?? "",
            });
    if (normalizedChunks.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_TEXT_SOURCE",
        "A source had no usable content to process.",
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

  return loadPromptSourceAssets(assets[0]?.sessionId ?? "");
}

function assetLabel(asset: PromptAssetWithChunks) {
  return asset.displayLabel ?? asset.originalFileName ?? "Untitled source";
}

function imageSourceText(asset: PromptAssetWithChunks) {
  return `Image source: ${assetLabel(asset)}. Inspect the attached image for client chat text, UI details, diagrams, feature notes, and other project requirements. If the image is unclear or not project-relevant, say that it does not provide enough actionable project information.`;
}

function imageSourceChunk(asset: PromptAssetWithChunks) {
  return {
    kind: "IMAGE_OBSERVATION" as const,
    orderIndex: 0,
    text: imageSourceText(asset),
    locator: {
      kind: "image-source",
      sourceAssetId: asset.id,
    },
    chunkLabel: "Image 1",
  };
}

export function textForPrompt(asset: PromptAssetWithChunks) {
  if (asset.sourceType === "IMAGE") return imageSourceText(asset);
  if (asset.textContent?.trim()) return asset.textContent.trim();
  return asset.chunks
    .map((chunk) => chunk.text)
    .join("\n\n")
    .trim();
}

export function buildSourceBundle(
  assets: PromptAssetWithChunks[],
): SourceBundle {
  const bodies = assets
    .map((asset) => ({
      asset,
      body: textForPrompt(asset),
      label: assetLabel(asset),
    }))
    .filter((e) => e.body.length > 0);

  if (bodies.length === 0) return { assets: [] };

  // Each source contributes its full text up to the per-source ceiling.
  // The ceiling is intentionally large (750 k chars by default) so that no
  // requirements are silently dropped.  A shared budget is NOT used — that
  // approach divided the allowance equally across sources and discarded
  // content from longer ones.
  return {
    assets: bodies.map(({ asset, body, label }) => ({
      id: asset.id,
      label,
      text: body.slice(0, PROMPT_BUNDLE_MAX_CHARS_PER_SOURCE),
      sourceType: asset.sourceType,
      mimeType: asset.mimeType,
      fileUrl: asset.appUrl ?? asset.ufsUrl,
    })),
  };
}

async function callModelWithRetry(bundle: SourceBundle) {
  try {
    logBriefPipeline("info", "Calling Gemini for brief generation.", {
      sourceAssetCount: bundle.assets.length,
      promptChars: bundle.assets.reduce(
        (sum, asset) => sum + asset.text.length,
        0,
      ),
      retry: false,
    });
    return assertBriefOutputHasContent(await generateBriefFromBundle(bundle));
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
      return assertBriefOutputHasContent(
        await generateBriefFromBundle(bundle, firstError.message),
      );
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
  assets: PromptAssetWithChunks[];
  documentType?: BriefDocumentType;
  revisionEvent?: {
    type: "GENERATED" | "REGENERATED";
    actorType: "SYSTEM" | "INTERNAL_USER";
    summary: string;
    metadata: Record<string, unknown>;
  };
};

function firstChunkByAssetId(assets: PromptAssetWithChunks[]) {
  const map = new Map<string, SourceChunk>();
  for (const asset of assets) {
    const firstChunk = asset.chunks[0];
    if (firstChunk) map.set(asset.id, firstChunk);
  }
  return map;
}

function normalizeEvidenceMatchText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/([\p{L}\p{N}])-\s+([\p{L}\p{N}])/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function pickBestChunkForEvidence(
  asset: PromptAssetWithChunks,
  excerpt: string,
): SourceChunk | null {
  if (asset.chunks.length === 0) return null;

  const normalizedExcerpt = normalizeEvidenceMatchText(excerpt);
  if (!normalizedExcerpt) return asset.chunks[0] ?? null;

  for (const chunk of asset.chunks) {
    if (normalizeEvidenceMatchText(chunk.text).includes(normalizedExcerpt)) {
      return chunk;
    }
  }

  const excerptTerms = Array.from(
    new Set(
      normalizedExcerpt
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter((term) => term.length >= 4),
    ),
  );
  if (excerptTerms.length === 0) return asset.chunks[0] ?? null;

  let bestChunk = asset.chunks[0] ?? null;
  let bestScore = -1;

  for (const chunk of asset.chunks) {
    const normalizedChunk = normalizeEvidenceMatchText(chunk.text);
    const score = excerptTerms.reduce(
      (sum, term) => sum + Number(normalizedChunk.includes(term)),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      bestChunk = chunk;
    }
  }

  return bestChunk;
}

function buildEvidenceRows(input: {
  snapshotId: string;
  claimId?: string;
  questionId?: string;
  evidence: BriefEvidenceOutput[];
  assetById: Map<string, PromptAssetWithChunks>;
  chunkByAssetId?: Map<string, SourceChunk>;
}) {
  return input.evidence
    .map((evidence) => {
      const asset = input.assetById.get(evidence.sourceAssetId);
      const chunk =
        input.chunkByAssetId?.get(evidence.sourceAssetId) ??
        (asset ? pickBestChunkForEvidence(asset, evidence.excerpt) : null);
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
  documentType = "GENERATED_BRIEF",
  revisionEvent,
}: PersistSnapshotInput) {
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const chunkByAssetId = firstChunkByAssetId(assets);

  return prisma.$transaction(
    async (tx) => {
      const latest = await tx.briefSnapshot.aggregate({
        where: { sessionId, documentType },
        _max: { version: true },
      });
      const version = (latest._max.version ?? 0) + 1;

      const snapshot = await tx.briefSnapshot.create({
        data: {
          projectId,
          sessionId,
          version,
          documentType,
          status: "DRAFT",
          sourceBundleVersion: version,
          createdBy: requestedBy,
        },
      });

      const claimInputs = [
        ...output.summary.map((item, orderIndex) => ({
          section: "SUMMARY" as const,
          orderIndex,
          item,
        })),
        ...output.goals.map((item, orderIndex) => ({
          section: "GOALS" as const,
          orderIndex,
          item,
        })),
      ];
      const questionInputs = [
        ...output.ambiguities.map((item, orderIndex) => ({
          section: "AMBIGUITIES" as const,
          orderIndex,
          item,
        })),
        ...output.followUpQuestions.map((item, orderIndex) => ({
          section: "FOLLOW_UP_QUESTIONS" as const,
          orderIndex,
          item,
        })),
      ];

      const claimIdByKey = new Map<string, string>();
      if (claimInputs.length > 0) {
        const claims = await tx.briefClaim.createManyAndReturn({
          data: claimInputs.map(({ section, orderIndex, item }) => ({
            snapshotId: snapshot.id,
            section,
            orderIndex,
            text: item.text,
            confidence: item.confidence,
          })),
          select: {
            id: true,
            section: true,
            orderIndex: true,
          },
        });
        for (const claim of claims) {
          claimIdByKey.set(`${claim.section}:${claim.orderIndex}`, claim.id);
        }
      }

      const questionIdByKey = new Map<string, string>();
      if (questionInputs.length > 0) {
        const questions = await tx.briefQuestion.createManyAndReturn({
          data: questionInputs.map(({ section, orderIndex, item }) => ({
            snapshotId: snapshot.id,
            section,
            orderIndex,
            text: item.text,
            reason: item.reason,
          })),
          select: {
            id: true,
            section: true,
            orderIndex: true,
          },
        });
        for (const question of questions) {
          questionIdByKey.set(
            `${question.section}:${question.orderIndex}`,
            question.id,
          );
        }
      }

      const evidenceRows = [
        ...claimInputs.flatMap(({ section, orderIndex, item }) => {
          const claimId = claimIdByKey.get(`${section}:${orderIndex}`);
          if (!claimId) return [];
          return buildEvidenceRows({
            snapshotId: snapshot.id,
            claimId,
            evidence: item.evidence,
            assetById,
            chunkByAssetId,
          });
        }),
        ...questionInputs.flatMap(({ section, orderIndex, item }) => {
          const questionId = questionIdByKey.get(`${section}:${orderIndex}`);
          if (!questionId) return [];
          return buildEvidenceRows({
            snapshotId: snapshot.id,
            questionId,
            evidence: item.evidence,
            assetById,
            chunkByAssetId,
          });
        }),
      ];
      if (evidenceRows.length > 0) {
        await tx.evidenceRef.createMany({ data: evidenceRows });
      }

      const evt = revisionEvent ?? {
        type: "GENERATED" as const,
        actorType: "SYSTEM" as const,
        summary: `Generated brief snapshot v${version}.`,
        metadata: { sourceAssetCount: assets.length, documentType },
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
        documentType,
        version: snapshot.version,
        claimCount: output.summary.length + output.goals.length,
        questionCount:
          output.ambiguities.length + output.followUpQuestions.length,
      });

      return snapshot;
    },
    {
      maxWait: SNAPSHOT_PERSIST_TRANSACTION_MAX_WAIT_MS,
      timeout: SNAPSHOT_PERSIST_TRANSACTION_TIMEOUT_MS,
    },
  );
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
      throw new BriefPipelineError(
        "SESSION_NOT_FOUND",
        "Intake session was not found.",
      );
    }

    if (input.processFileSources !== false) {
      await processSessionFileSources({
        sessionId: input.sessionId,
        requestedBy: input.requestedBy,
      });
    }

    const initialAssets = await loadPromptSourceAssets(input.sessionId);
    const assetsWithText = initialAssets.filter((asset) =>
      textForPrompt(asset).trim(),
    );

    if (assetsWithText.length === 0) {
      throw new BriefPipelineError(
        "NO_SOURCES",
        "No text sources are available for this session.",
      );
    }

    const assets = await ensureSourceChunks(assetsWithText);
    const bundle = buildSourceBundle(assets);
    if (bundle.assets.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_BUNDLE",
        "Source bundle was empty after assembly.",
      );
    }

    const latestSnapshot = await prisma.briefSnapshot.findFirst({
      where: {
        sessionId: input.sessionId,
        documentType: "GENERATED_BRIEF",
      },
      orderBy: { version: "desc" },
      select: {
        claims: {
          select: { text: true, section: true },
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        },
      },
    });
    if (latestSnapshot?.claims?.length) {
      bundle.existingClaims = latestSnapshot.claims.map((c) => ({
        text: c.text,
        section: c.section as string,
      }));
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
      output = assertBriefOutputHasContent(
        BriefOutputSchema.parse(extractJson(fullText)),
      );
    } catch (outputError) {
      logBriefPipeline(
        "warn",
        "Stream output invalid or empty, retrying non-streaming.",
        {
          jobId: input.jobId,
          errorMessage:
            outputError instanceof Error
              ? outputError.message
              : "Output validation failed.",
        },
      );
      const hint = pipelineErrorFromUnknown(outputError).message;
      try {
        output = assertBriefOutputHasContent(
          await generateBriefFromBundle(bundle, hint),
        );
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

    yield {
      type: "complete",
      snapshotId: snapshot.id,
      version: snapshot.version,
    };
  } catch (error) {
    const pipelineError = await markJobFailed(input.jobId, error);
    yield {
      type: "error",
      code: pipelineError.code,
      message: pipelineError.message,
    };
  }
}

export async function runBriefGeneration({
  jobId,
  sessionId,
  requestedBy,
  processFileSources: shouldProcessFileSources = true,
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

    if (shouldProcessFileSources) {
      await processSessionFileSources({
        sessionId,
        requestedBy,
      });
    }

    const initialAssets = await loadPromptSourceAssets(sessionId);
    const assetsWithText = initialAssets.filter((asset) =>
      textForPrompt(asset).trim(),
    );

    logBriefPipeline("info", "Loaded prompt assets for generation.", {
      jobId,
      sessionId,
      totalAssets: initialAssets.length,
      usablePromptAssets: assetsWithText.length,
    });

    if (assetsWithText.length === 0) {
      throw new BriefPipelineError(
        "NO_SOURCES",
        "No text sources are available for this session.",
      );
    }

    const assets = await ensureSourceChunks(assetsWithText);
    const bundle = buildSourceBundle(assets);
    if (bundle.assets.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_BUNDLE",
        "Source bundle was empty after assembly.",
      );
    }

    const latestSnapshotForRun = await prisma.briefSnapshot.findFirst({
      where: {
        sessionId,
        documentType: "GENERATED_BRIEF",
      },
      orderBy: { version: "desc" },
      select: {
        claims: {
          select: { text: true, section: true },
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
        },
      },
    });
    if (latestSnapshotForRun?.claims?.length) {
      bundle.existingClaims = latestSnapshotForRun.claims.map((c) => ({
        text: c.text,
        section: c.section as string,
      }));
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
