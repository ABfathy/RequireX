import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";
import { BriefPipelineError, runBriefRevision } from "@/server/services/brief-revision";

type RouteContext = { params: Promise<{ sessionId: string }> };

const InputSchema = z.object({
  snapshotId: z.string().uuid(),
});

async function buildAcceptedFeedbackMessage(snapshotId: string): Promise<string> {
  const [answers, comments] = await Promise.all([
    prisma.followUpAnswer.findMany({
      where: { snapshotId, reviewStatus: "ACCEPTED" },
      orderBy: { createdAt: "asc" },
      select: {
        body: true,
        question: { select: { text: true } },
      },
    }),
    prisma.briefComment.findMany({
      where: { snapshotId, reviewStatus: "ACCEPTED" },
      orderBy: { createdAt: "asc" },
      select: { section: true, body: true, authorName: true },
    }),
  ]);

  const lines: string[] = [
    "The editor has reviewed client feedback and selected the following items to incorporate:",
  ];

  if (answers.length > 0) {
    lines.push("\nCLIENT ANSWERS (accepted):");
    for (const a of answers) {
      lines.push(`  Q: ${a.question.text}`);
      lines.push(`  A: ${a.body}`);
    }
  }

  if (comments.length > 0) {
    lines.push("\nCLIENT COMMENTS (accepted):");
    for (const c of comments) {
      const by = c.authorName ? ` (${c.authorName})` : "";
      lines.push(`  [${c.section}]${by}: ${c.body}`);
    }
  }

  if (answers.length === 0 && comments.length === 0) {
    lines.push("\nNo feedback was accepted for incorporation.");
  }

  lines.push(
    "\nPlease update the brief to incorporate the accepted feedback while ignoring any declined items.",
  );

  return lines.join("\n");
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireInternalAuth();
    const { sessionId } = await params;

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const snapshot = await prisma.briefSnapshot.findFirst({
      where: { id: parsed.data.snapshotId, session: { id: sessionId } },
      select: { id: true },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const userMessage = await buildAcceptedFeedbackMessage(parsed.data.snapshotId);

    const newSnapshot = await runBriefRevision({
      sessionId,
      snapshotId: parsed.data.snapshotId,
      userMessage,
      requestedBy: auth.clerkUserId,
    });

    return NextResponse.json({ ok: true, snapshotId: newSnapshot.snapshotId });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    if (error instanceof BriefPipelineError) {
      const isRateLimit = error.message.includes("429") || error.message.includes("RESOURCE_EXHAUSTED");
      return NextResponse.json(
        {
          error: "REGEN_FAILED",
          message: isRateLimit
            ? "AI service is rate-limited. Wait a minute and try again."
            : `Regeneration failed: ${error.message.slice(0, 200)}`,
        },
        { status: 503 },
      );
    }
    console.error({ scope: "api.sessions.regenerate-from-feedback.post", error });
    return NextResponse.json({ error: "REGEN_FAILED", message: "Regeneration failed. Please try again." }, { status: 500 });
  }
}
