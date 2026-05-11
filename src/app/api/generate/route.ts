import { NextResponse } from "next/server";
import { z } from "zod";

import { serverEnv } from "@/lib/env/server";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import {
  BriefGenerationRequestError,
  requestBriefGeneration,
} from "@/server/services/brief-generation";
import {
  BriefPipelineError,
  runBriefGeneration,
} from "@/server/services/brief-pipeline";

const generateRequestSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = generateRequestSchema.parse(await request.json());
    const runMode =
      serverEnv.BRIEF_GENERATION_ASYNC === "1" ? "async" : "sync";

    const job = await requestBriefGeneration({
      sessionId: body.sessionId,
      requestedBy: auth.clerkUserId,
      runMode,
    });

    if (runMode === "async") {
      return NextResponse.json(
        {
          jobId: job.id,
          sessionId: job.sessionId,
          status: job.status,
          type: job.type,
        },
        { status: 202 },
      );
    }

    try {
      const result = await runBriefGeneration({
        jobId: job.id,
        sessionId: body.sessionId,
        requestedBy: auth.clerkUserId,
      });

      return NextResponse.json(
        {
          jobId: job.id,
          status: "SUCCEEDED",
          snapshotId: result.snapshotId,
          version: result.version,
        },
        { status: 200 },
      );
    } catch (pipelineError) {
      const code =
        pipelineError instanceof BriefPipelineError
          ? pipelineError.code
          : "PIPELINE_FAILED";
      const message =
        pipelineError instanceof Error
          ? pipelineError.message
          : "Brief generation failed.";

      return NextResponse.json(
        { jobId: job.id, status: "FAILED", error: code, message },
        { status: 500 },
      );
    }
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
          message: "Request body must include a valid sessionId.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        error: "GENERATION_REQUEST_FAILED",
        message: "Failed to request brief generation.",
      },
      {
        status: 500,
      },
    );
  }
}
