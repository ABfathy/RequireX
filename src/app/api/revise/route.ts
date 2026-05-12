import { NextResponse } from "next/server";
import { z } from "zod";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import {
  BriefPipelineError,
  runBriefRevision,
} from "@/server/services/brief-revision";

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

    const result = await runBriefRevision({
      sessionId: body.sessionId,
      snapshotId: body.snapshotId,
      userMessage: body.userMessage,
      selectionText: body.selectionText,
      selectedItemId: body.selectedItemId,
      requestedBy: auth.clerkUserId,
    });

    return NextResponse.json(result, { status: 200 });
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

    if (error instanceof BriefPipelineError) {
      const statusMap: Record<string, number> = {
        SESSION_NOT_FOUND: 404,
        SNAPSHOT_NOT_FOUND: 404,
        NO_SOURCES: 400,
        EMPTY_BUNDLE: 400,
      };
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: statusMap[error.code] ?? 500 },
      );
    }

    console.error({ scope: "api.revise", error });
    return NextResponse.json(
      { error: "REVISION_FAILED", message: "Failed to revise brief." },
      { status: 500 },
    );
  }
}
