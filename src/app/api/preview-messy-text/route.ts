import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import { inngest } from "@/server/inngest/client";
import {
  INNGEST_EVENTS,
  TEXT_BRIEF_SYSTEM_PROMPT,
  type TextBriefRequestedEvent,
} from "@/server/inngest/events";

const PreviewMessyTextSchema = z.object({
  textContent: z.string().min(1).max(500_000),
});

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = await request.json();
    const parsed = PreviewMessyTextSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Request body must include textContent.",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const event: TextBriefRequestedEvent = {
      name: INNGEST_EVENTS.TEXT_BRIEF_REQUESTED,
      data: {
        assetId: `preview-${crypto.randomUUID()}`,
        sessionId: "local-preview",
        requestedBy: auth.clerkUserId,
        requestedAt: new Date().toISOString(),
        systemPrompt: TEXT_BRIEF_SYSTEM_PROMPT,
        textContent: parsed.data.textContent,
      },
    };

    await inngest.send(event);

    return NextResponse.json(
      {
        event: event.name,
        mode: "preview",
      },
      { status: 202 },
    );
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error: "PREVIEW_EVENT_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to send prompt preview event.",
      },
      { status: 500 },
    );
  }
}
