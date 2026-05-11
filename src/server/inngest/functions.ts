import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";

const textBriefRequestedDataSchema = z.object({
  assetId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
  systemPrompt: z.string().min(1),
  textContent: z.string().min(1),
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
      model: "unconfigured-ai-provider",
      systemPrompt: data.systemPrompt,
      userText: data.textContent,
      metadata: {
        assetId: data.assetId,
        sessionId: data.sessionId,
        requestedBy: data.requestedBy,
        requestedAt: data.requestedAt,
      },
    }));

    await step.run("send-to-ai", async () => {
      throw new NonRetriableError(
        `AI provider is not configured. Would have sent: ${JSON.stringify(
          promptPayload,
        )}`,
      );
    });

    return step.run("persist-ai-response", async () => ({
      skipped: true,
    }));
  },
);

export const inngestFunctions = [generateBriefFromText];
