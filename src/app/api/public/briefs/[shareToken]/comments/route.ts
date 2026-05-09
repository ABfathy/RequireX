import { NextRequest, NextResponse } from "next/server";

import {
  assertPublicMutationRateLimit,
  getRequestClientIp,
  PublicRateLimitError,
} from "@/server/auth/public";
import {
  createPublicComment,
  PublicReviewReadOnlyError,
  PublicReviewValidationError,
  PublicShareLinkNotFoundError,
} from "@/server/services/public-review";
import { PublicCommentInputSchema } from "@/server/validators";

type RouteContext = { params: Promise<{ shareToken: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { shareToken } = await params;
    assertPublicMutationRateLimit({
      action: "comment",
      ip: getRequestClientIp(req.headers),
      shareToken,
    });

    const body = await req.json();
    const parsed = PublicCommentInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const comment = await createPublicComment(shareToken, parsed.data);
    return NextResponse.json({ comment }, { status: 201 });
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

    if (error instanceof PublicReviewValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
