import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import { runBriefRevisionStream } from "@/server/services/brief-revision";

const reviseRequestSchema = z.object({
  sessionId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  userMessage: z.string().min(1).max(2000),
  selectionText: z.string().max(500).optional(),
  selectedItemId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = reviseRequestSchema.parse(await request.json());

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );

        for await (const event of runBriefRevisionStream({
          sessionId: body.sessionId,
          snapshotId: body.snapshotId,
          userMessage: body.userMessage,
          selectionText: body.selectionText,
          selectedItemId: body.selectedItemId,
          requestedBy: auth.clerkUserId,
        })) {
          send(event);
        }

        controller.close();
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Invalid request body." },
        { status: 400 },
      );
    }

    console.error({ scope: "api.revise", error });
    return NextResponse.json(
      { error: "REVISION_FAILED", message: "Failed to revise brief." },
      { status: 500 },
    );
  }
}
