import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import {
  createFinalizedDocumentStream,
  FinalizedDocumentGenerationError,
} from "@/server/services/finalized-documents";

type RouteContext = { params: Promise<{ sessionId: string }> };

const paramsSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const auth = await requireInternalAuth();
    const { sessionId } = paramsSchema.parse(await params);

    const encoder = new TextEncoder();
    const requestedBy = auth.clerkUserId;

    const sseStream = new ReadableStream({
      async start(controller) {
        const send = (data: object) =>
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
          );

        send({ type: "start" });

        for await (const event of createFinalizedDocumentStream({
          sessionId,
          requestedBy,
        })) {
          send(event);
        }

        controller.close();
      },
    });

    return new Response(sseStream, {
      status: 201,
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

    if (error instanceof FinalizedDocumentGenerationError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message: "Route must include a valid sessionId.",
        },
        { status: 400 },
      );
    }

    console.error({ scope: "api.sessions.finalized-documents", error });
    return NextResponse.json(
      {
        error: "FINALIZED_DOCUMENT_FAILED",
        message: "Failed to create finalized document.",
      },
      { status: 500 },
    );
  }
}
