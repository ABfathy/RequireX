import { NextRequest, NextResponse } from "next/server";

import {
  assertPublicMutationRateLimit,
  getRequestClientIp,
  PublicRateLimitError,
} from "@/server/auth/public";
import {
  confirmPublicBrief,
  PublicReviewReadOnlyError,
  PublicShareLinkNotFoundError,
} from "@/server/services/public-review";
import { PublicBriefConfirmInputSchema } from "@/server/validators";

type RouteContext = { params: Promise<{ shareToken: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { shareToken } = await params;
    assertPublicMutationRateLimit({
      action: "confirm",
      ip: getRequestClientIp(req.headers),
      shareToken,
    });

    const body = await req.json();
    const parsed = PublicBriefConfirmInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const snapshot = await confirmPublicBrief(shareToken, parsed.data);
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof PublicRateLimitError) {
      return NextResponse.json(
        { error: error.message },
        {
          status: error.status,
          headers: {
            "Retry-After": String(error.retryAfterSeconds),
          },
        },
      );
    }

    if (error instanceof PublicShareLinkNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof PublicReviewReadOnlyError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
