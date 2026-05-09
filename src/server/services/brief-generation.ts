import { inngest } from "@/server/inngest/client";
import {
  type BriefGenerationRequestedEvent,
  type BriefRegenerationRequestedEvent,
  INNGEST_EVENTS,
} from "@/server/inngest/events";

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

export async function requestBriefGeneration({
  sessionId,
  requestedBy,
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
      },
    },
  });

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

  return job;
}

export async function requestBriefRegeneration({
  sessionId,
  sourceSnapshotId,
  requestedBy,
}: RequestBriefRegenerationInput) {
  const { prisma } = await import("@/lib/prisma");

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
      },
    },
  });

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

  return job;
}
