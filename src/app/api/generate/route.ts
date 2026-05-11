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

function logGenerateRequest(
  level: "info" | "error",
  message: string,
  details: Record<string, unknown>,
) {
  const payload = {
    scope: "api.generate",
    message,
    ...details,
  };

  if (level === "error") {
    console.error(payload);
    return;
  }

  console.info(payload);
}

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = generateRequestSchema.parse(await request.json());
    const runMode =
      serverEnv.BRIEF_GENERATION_ASYNC === "1" ? "async" : "sync";

    logGenerateRequest("info", "Received brief generation request.", {
      sessionId: body.sessionId,
      requestedBy: auth.clerkUserId,
      runMode,
    });

    const job = await requestBriefGeneration({
      sessionId: body.sessionId,
      requestedBy: auth.clerkUserId,
      runMode,
    });

    logGenerateRequest("info", "Created processing job.", {
      sessionId: body.sessionId,
      jobId: job.id,
      runMode,
      status: job.status,
    });

    if (runMode === "async") {
      logGenerateRequest("info", "Queued async generation job.", {
        sessionId: body.sessionId,
        jobId: job.id,
      });
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

      logGenerateRequest("info", "Sync brief generation succeeded.", {
        sessionId: body.sessionId,
        jobId: job.id,
        snapshotId: result.snapshotId,
        version: result.version,
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

      logGenerateRequest("error", "Sync brief generation failed.", {
        sessionId: body.sessionId,
        jobId: job.id,
        errorCode: code,
        errorMessage: message,
      });

      return NextResponse.json(
        { jobId: job.id, status: "FAILED", error: code, message },
        { status: 500 },
      );
    }
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      logGenerateRequest("error", "Unauthorized generation request.", {
        errorCode: error.code,
        errorMessage: error.message,
      });
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
      logGenerateRequest("error", "Failed to create generation job.", {
        errorCode: error.code,
        errorMessage: error.message,
      });
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
      logGenerateRequest("error", "Invalid generation request body.", {
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
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

    logGenerateRequest("error", "Unexpected generation request failure.", {
      errorMessage:
        error instanceof Error ? error.message : "Unknown generation error.",
    });

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
