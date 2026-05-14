import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import {
  createFinalizedDocument,
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
    const result = await createFinalizedDocument({
      sessionId,
      requestedBy: auth.clerkUserId,
    });

    return NextResponse.json(result, { status: 201 });
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
