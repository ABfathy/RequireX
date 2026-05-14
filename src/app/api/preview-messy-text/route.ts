import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";

export async function POST(request: Request) {
  try {
    await requireInternalAuth();
    await request.json().catch(() => null);

    return NextResponse.json(
      {
        error: "LEGACY_GENERATION_FLOW_DISABLED",
        message:
          "Preview text generation is no longer handled by Inngest. Use the normal brief generation flow from the workspace.",
      },
      { status: 410 },
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
        error: "PREVIEW_REQUEST_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to handle preview request.",
      },
      { status: 500 },
    );
  }
}
