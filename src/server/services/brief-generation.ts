import { inngest } from "@/server/inngest/client";
import {
  type BriefGenerationRequestedEvent,
  type BriefRegenerationRequestedEvent,
  INNGEST_EVENTS,
} from "@/server/inngest/events";
import {
  loadProcessableFileSources,
  PDF_TEXT_PARSER_VERSION,
} from "@/server/services/source-processing";

const SOURCE_PROCESSING_POLL_INTERVAL_MS = 1_000;
const SOURCE_PROCESSING_TIMEOUT_MS = 15 * 60 * 1_000;

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class BriefGenerationRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code = "GENERATION_REQUEST_FAILED",
  ) {
    super(message);
    this.name = "BriefGenerationRequestError";
  }
}

type RequestBriefGenerationInput = {
  sessionId: string;
  requestedBy: string;
  runMode?: "sync" | "async" | "async-stream";
};

type RequestBriefRegenerationInput = RequestBriefGenerationInput & {
  sourceSnapshotId: string;
};

async function markDispatchFailure(jobId: string, error: unknown) {
  const { prisma } = await import("@/lib/prisma");

  await prisma.processingJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode: "INNGEST_EVENT_SEND_FAILED",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to dispatch Inngest event.",
    },
  });
}

function asMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function fileSourceReadyForPrompt(asset: {
  sourceType: string;
  status: string;
  textContent: string | null;
  providerMetadata: unknown;
  _count: {
    chunks: number;
  };
}) {
  if (
    asset.status !== "PROCESSED" ||
    !asset.textContent?.trim() ||
    asset._count.chunks === 0
  ) {
    return false;
  }

  if (asset.sourceType !== "PDF") return true;
  return (
    asMetadataObject(asset.providerMetadata).parser === PDF_TEXT_PARSER_VERSION
  );
}

export async function processSessionFileSourcesWithInngest({
  sessionId,
  requestedBy,
  requestedAt,
  jobId,
}: {
  sessionId: string;
  requestedBy: string;
  requestedAt: string;
  jobId: string;
}) {
  const { prisma } = await import("@/lib/prisma");
  const sources = await loadProcessableFileSources(sessionId);
  if (sources.length === 0) return [];

  await Promise.all(
    sources.map((source) =>
      inngest.send({
        name:
          source.sourceType === "PDF"
            ? INNGEST_EVENTS.PDF_SOURCE_PROCESSING_REQUESTED
            : INNGEST_EVENTS.AUDIO_SOURCE_PROCESSING_REQUESTED,
        data: {
          assetId: source.id,
          sessionId,
          requestedBy,
          requestedAt,
          jobId,
        },
      }),
    ),
  );

  const pendingIds = new Set(sources.map((source) => source.id));
  const deadline = Date.now() + SOURCE_PROCESSING_TIMEOUT_MS;

  while (pendingIds.size > 0) {
    const assets = await prisma.sourceAsset.findMany({
      where: {
        id: { in: [...pendingIds] },
        sessionId,
        sourceType: { in: ["PDF", "AUDIO"] },
      },
      select: {
        id: true,
        sourceType: true,
        status: true,
        textContent: true,
        errorMessage: true,
        providerMetadata: true,
        _count: {
          select: {
            chunks: true,
          },
        },
      },
    });

    for (const asset of assets) {
      if (asset.status === "FAILED") {
        throw new BriefGenerationRequestError(
          asset.errorMessage ?? `${asset.sourceType} source processing failed.`,
          500,
          "SOURCE_PROCESSING_FAILED",
        );
      }

      if (fileSourceReadyForPrompt(asset)) {
        pendingIds.delete(asset.id);
      }
    }

    if (pendingIds.size === 0) break;
    if (Date.now() >= deadline) {
      throw new BriefGenerationRequestError(
        "Timed out waiting for Inngest to process source files.",
        504,
        "SOURCE_PROCESSING_TIMEOUT",
      );
    }

    await delay(SOURCE_PROCESSING_POLL_INTERVAL_MS);
  }

  return sources;
}

export async function requestBriefGeneration({
  sessionId,
  requestedBy,
  runMode = "sync",
}: RequestBriefGenerationInput) {
  const { prisma } = await import("@/lib/prisma");

  const session = await prisma.intakeSession.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      id: true,
    },
  });

  if (!session) {
    throw new BriefGenerationRequestError(
      "Intake session was not found.",
      404,
      "SESSION_NOT_FOUND",
    );
  }

  const requestedAt = new Date().toISOString();
  const job = await prisma.processingJob.create({
    data: {
      sessionId,
      type: "GENERATION",
      status: "QUEUED",
      payload: {
        requestedBy,
        requestedAt,
        runMode,
      },
    },
  });

  if (runMode === "async") {
    const event: BriefGenerationRequestedEvent = {
      name: INNGEST_EVENTS.BRIEF_GENERATION_REQUESTED,
      data: {
        jobId: job.id,
        sessionId,
        requestedBy,
        requestedAt,
      },
    };

    try {
      await inngest.send(event);
    } catch (error) {
      await markDispatchFailure(job.id, error);
      throw new BriefGenerationRequestError(
        "Failed to dispatch the generation job.",
        502,
        "INNGEST_EVENT_SEND_FAILED",
      );
    }
  }

  return job;
}

export async function requestBriefRegeneration({
  sessionId,
  sourceSnapshotId,
  requestedBy,
  runMode = "async",
}: RequestBriefRegenerationInput) {
  const { prisma } = await import("@/lib/prisma");

  const sourceSnapshot = await prisma.briefSnapshot.findFirst({
    where: {
      id: sourceSnapshotId,
      sessionId,
      documentType: "GENERATED_BRIEF",
    },
    select: {
      id: true,
    },
  });

  if (!sourceSnapshot) {
    throw new BriefGenerationRequestError(
      "Source brief snapshot was not found for this intake session.",
      404,
      "SOURCE_SNAPSHOT_NOT_FOUND",
    );
  }

  const requestedAt = new Date().toISOString();
  const job = await prisma.processingJob.create({
    data: {
      sessionId,
      sourceSnapshotId,
      type: "REGENERATION",
      status: "QUEUED",
      payload: {
        requestedBy,
        requestedAt,
        sourceSnapshotId,
        runMode,
      },
    },
  });

  if (runMode === "async") {
    const event: BriefRegenerationRequestedEvent = {
      name: INNGEST_EVENTS.BRIEF_REGENERATION_REQUESTED,
      data: {
        jobId: job.id,
        sessionId,
        sourceSnapshotId,
        requestedBy,
        requestedAt,
      },
    };

    try {
      await inngest.send(event);
    } catch (error) {
      await markDispatchFailure(job.id, error);
      throw new BriefGenerationRequestError(
        "Failed to dispatch the regeneration job.",
        502,
        "INNGEST_EVENT_SEND_FAILED",
      );
    }
  }

  return job;
}
