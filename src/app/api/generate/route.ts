import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

const legacyGenerationDisabled = {
  error: "LEGACY_GENERATION_FLOW_DISABLED",
  message:
    "Submit text through the Sources panel to run the single text brief Inngest event.",
};

export async function POST() {
  try {
    await requireInternalAuth();

    return NextResponse.json(legacyGenerationDisabled, { status: 410 });
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
