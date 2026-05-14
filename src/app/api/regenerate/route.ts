import { NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

const legacyRegenerationDisabled = {
  error: "REGENERATION_NOT_IMPLEMENTED",
  message:
    "Brief regeneration is not implemented. Generate a new brief from the workspace instead.",
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
