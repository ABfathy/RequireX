import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";
import { runBriefGeneration } from "@/server/services/brief-pipeline";
import {
  loadProcessableFileSources,
  processAudioAsset,
  processPdfAsset,
} from "@/server/services/source-processing";

const textBriefRequestedDataSchema = z.object({
  assetId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  systemPrompt: z.string().min(1),
  textContent: z.string().min(1),
});

const sourceProcessingEventDataSchema = z.object({
  assetId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  jobId: z.string().min(1).optional(),
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

export const processPdfSourceAsset = inngest.createFunction(
  {
    id: "process-pdf-source-asset",
    name: "Process PDF source asset",
    triggers: [
      {
        event: INNGEST_EVENTS.PDF_SOURCE_PROCESSING_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = sourceProcessingEventDataSchema.parse(event.data);

    return step.run("parse-pdf-and-store-text", async () =>
      processPdfAsset({
        assetId: data.assetId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
      }),
    );
  },
);

export const processAudioSourceAsset = inngest.createFunction(
  {
    id: "process-audio-source-asset",
    name: "Process audio source asset",
    triggers: [
      {
        event: INNGEST_EVENTS.AUDIO_SOURCE_PROCESSING_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = sourceProcessingEventDataSchema.parse(event.data);

    return step.run("transcribe-audio-and-store-text", async () =>
      processAudioAsset({
        assetId: data.assetId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
      }),
    );
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

    const fileSources = await step.run("load-file-source-processing-work", () =>
      loadProcessableFileSources(data.sessionId),
    );

    for (const source of fileSources) {
      const eventData = {
        assetId: source.id,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
        requestedAt: data.requestedAt,
        jobId: data.jobId,
      };

      if (source.sourceType === "PDF") {
        await step.invoke(`process-pdf-source-${source.id}`, {
          function: processPdfSourceAsset,
          data: eventData,
          timeout: "15m",
        });
      } else if (source.sourceType === "AUDIO") {
        await step.invoke(`process-audio-source-${source.id}`, {
          function: processAudioSourceAsset,
          data: eventData,
          timeout: "15m",
        });
      }
    }

    return step.run("run-brief-generation", async () =>
      runBriefGeneration({
        jobId: data.jobId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
        processFileSources: false,
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
  processPdfSourceAsset,
  processAudioSourceAsset,
  generateBriefSnapshot,
  regenerateBriefSnapshot,
];
