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

async function buildClientFeedbackMessage(snapshotId: string): Promise<string> {
  const { prisma } = await import("@/lib/prisma");
  const [questions, comments] = await Promise.all([
    prisma.briefQuestion.findMany({
      where: { snapshotId, status: "ANSWERED" },
      select: {
        text: true,
        section: true,
        answers: {
          select: { body: true },
          orderBy: { createdAt: "asc" as const },
          take: 1,
        },
      },
    }),
    prisma.briefComment.findMany({
      where: { snapshotId },
      orderBy: { createdAt: "asc" },
      select: { section: true, body: true, authorName: true },
    }),
  ]);

  const lines: string[] = [
    "The client has confirmed and approved the brief. Below is the feedback they provided:",
  ];

  if (questions.length > 0) {
    lines.push("\nCLIENT ANSWERS:");
    for (const q of questions) {
      const answer = q.answers[0]?.body;
      if (answer) {
        lines.push(`  Q: ${q.text}`);
        lines.push(`  A: ${answer}`);
      }
    }
  }

  if (comments.length > 0) {
    lines.push("\nCLIENT COMMENTS:");
    for (const c of comments) {
      const by = c.authorName ? ` (${c.authorName})` : "";
      lines.push(`  [${c.section}]${by}: ${c.body}`);
    }
  }

  if (questions.length === 0 && comments.length === 0) {
    lines.push("\nNo additional feedback was provided.");
  }

  lines.push(
    "\nPlease incorporate any clarifications from the answers and address any comments where appropriate.",
  );

  return lines.join("\n");
}

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

    // Fire-and-forget: auto-revise the brief with all client feedback
    if (snapshot.status === "CONFIRMED" && snapshot.sessionId) {
      void buildClientFeedbackMessage(snapshot.id).then((userMessage) =>
        import("@/server/services/brief-revision")
          .then(({ runBriefRevision }) =>
            runBriefRevision({
              sessionId: snapshot.sessionId,
              snapshotId: snapshot.id,
              userMessage,
              requestedBy: `client:confirm:${shareToken}`,
            }),
          )
          .catch(() => {
            // Silently ignore revision errors — confirmation already succeeded
          }),
      );
    }

    return NextResponse.json({
      snapshot: { id: snapshot.id, status: snapshot.status },
    });
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
