import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";
import { processAudioAsset, processPdfAsset } from "@/server/services/source-processing";

const sourceProcessingEventDataSchema = z.object({
  assetId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  jobId: z.string().min(1).optional(),
});

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

export const inngestFunctions = [
  processPdfSourceAsset,
  processAudioSourceAsset,
];
