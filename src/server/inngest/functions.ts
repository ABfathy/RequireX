import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";
import { runBriefGeneration } from "@/server/services/brief-pipeline";

const textBriefRequestedDataSchema = z.object({
  assetId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  systemPrompt: z.string().min(1),
  textContent: z.string().min(1),
});

const generationEventDataSchema = z.object({
  jobId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
});

const regenerationEventDataSchema = generationEventDataSchema.extend({
  sourceSnapshotId: z.string().min(1),
});

export const generateBriefFromText = inngest.createFunction(
  {
    id: "generate-brief-from-text",
    name: "Generate brief from text",
    triggers: [
      {
        event: INNGEST_EVENTS.TEXT_BRIEF_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = textBriefRequestedDataSchema.parse(event.data);

    const promptPayload = await step.run("build-ai-request", async () => ({
      model: "gemini-2.5-flash",
      systemPrompt: data.systemPrompt,
      userText: data.textContent,
      metadata: {
        assetId: data.assetId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
        requestedAt: data.requestedAt,
      },
    }));

    await step.run("stop-legacy-text-pipeline", async () => {
      throw new NonRetriableError(
        `Legacy text-only pipeline is disabled. Use /api/generate. Would have sent: ${JSON.stringify(
          promptPayload,
        )}`,
      );
    });
  },
);

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

    return step.run("run-brief-generation", async () =>
      runBriefGeneration({
        jobId: data.jobId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
      }),
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
  async ({ event }) => {
    const data = regenerationEventDataSchema.parse(event.data);
    throw new NonRetriableError(
      `Brief regeneration is not implemented yet for source snapshot ${data.sourceSnapshotId}.`,
    );
  },
);

export const inngestFunctions = [
  generateBriefFromText,
  generateBriefSnapshot,
  regenerateBriefSnapshot,
];
