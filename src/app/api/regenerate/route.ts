import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import {
  BriefGenerationRequestError,
  requestBriefRegeneration,
} from "@/server/services/brief-generation";

const regenerateRequestSchema = z.object({
  sessionId: z.string().min(1),
  sourceSnapshotId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = regenerateRequestSchema.parse(await request.json());
    const job = await requestBriefRegeneration({
      sessionId: body.sessionId,
      sourceSnapshotId: body.sourceSnapshotId,
      requestedBy: auth.clerkUserId,
    });

    return NextResponse.json(
      {
        jobId: job.id,
        sessionId: job.sessionId,
        sourceSnapshotId: job.sourceSnapshotId,
        status: job.status,
        type: job.type,
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    if (error instanceof BriefGenerationRequestError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
        },
        {
          status: error.status,
        },
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST",
          message:
            "Request body must include a valid sessionId and sourceSnapshotId.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error: "REGENERATION_REQUEST_FAILED",
        message: "Failed to request brief regeneration.",
      },
      {
        status: 500,
      },
    );
  }
}
