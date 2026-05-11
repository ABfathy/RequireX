import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

const legacyRegenerationDisabled = {
  error: "LEGACY_GENERATION_FLOW_DISABLED",
  message:
    "Submit text through the Sources panel to run the single text brief Inngest event.",
};

export async function POST() {
  try {
    await requireInternalAuth();

    return NextResponse.json(legacyRegenerationDisabled, { status: 410 });
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
        error: "REGENERATION_REQUEST_FAILED",
        message: "Failed to request brief regeneration.",
      },
      {
        status: 500,
      },
    );
  }
}
