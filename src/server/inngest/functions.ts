import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";

const generationEventDataSchema = z.object({
  jobId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
});

const regenerationEventDataSchema = generationEventDataSchema.extend({
  sourceSnapshotId: z.string().min(1),
});

async function markPipelineNotImplemented(jobId: string) {
  const { prisma } = await import("@/lib/prisma");

  await prisma.processingJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode: "PIPELINE_NOT_IMPLEMENTED",
      errorMessage:
        "The Inngest trigger is wired, but the AI processing pipeline is not implemented yet.",
    },
  });
}

export const generateBriefSnapshot = inngest.createFunction(
  {
    id: "brief-generate-snapshot",
    name: "Generate brief snapshot",
    triggers: [
      {
        event: INNGEST_EVENTS.BRIEF_GENERATION_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = generationEventDataSchema.parse(event.data);

    await step.run("mark-generation-job-running", async () => {
      const { prisma } = await import("@/lib/prisma");

      return prisma.processingJob.update({
        where: {
          id: data.jobId,
        },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          attemptCount: {
            increment: 1,
          },
        },
      });
    });

    await step.run("stop-unimplemented-generation-pipeline", async () => {
      await markPipelineNotImplemented(data.jobId);
    });

    throw new NonRetriableError(
      "Brief generation processing is not implemented yet.",
    );
  },
);

export const regenerateBriefSnapshot = inngest.createFunction(
  {
    id: "brief-regenerate-snapshot",
    name: "Regenerate brief snapshot",
    triggers: [
      {
        event: INNGEST_EVENTS.BRIEF_REGENERATION_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = regenerationEventDataSchema.parse(event.data);

    await step.run("mark-regeneration-job-running", async () => {
      const { prisma } = await import("@/lib/prisma");

      return prisma.processingJob.update({
        where: {
          id: data.jobId,
        },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          attemptCount: {
            increment: 1,
          },
        },
      });
    });

    await step.run("stop-unimplemented-regeneration-pipeline", async () => {
      await markPipelineNotImplemented(data.jobId);
    });

    throw new NonRetriableError(
      "Brief regeneration processing is not implemented yet.",
    );
  },
);

export const inngestFunctions = [
  generateBriefSnapshot,
  regenerateBriefSnapshot,
];
