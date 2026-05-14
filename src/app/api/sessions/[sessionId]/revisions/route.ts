import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;

    const events = await prisma.revisionEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        type: true,
        actorType: true,
        summary: true,
        metadata: true,
        createdAt: true,
        snapshotId: true,
        snapshot: {
          select: { version: true, status: true },
        },
      },
    });

    const commentIds = events
      .filter((e) => e.type === "CLIENT_COMMENT_ADDED")
      .map(
        (e) =>
          (e.metadata as Record<string, unknown>)?.commentId as
            | string
            | undefined,
      )
      .filter(Boolean) as string[];

    const answerIds = events
      .filter((e) => e.type === "CLIENT_ANSWER_ADDED")
      .map(
        (e) =>
          (e.metadata as Record<string, unknown>)?.answerId as
            | string
            | undefined,
      )
      .filter(Boolean) as string[];

    const [comments, answers] = await Promise.all([
      commentIds.length > 0
        ? prisma.briefComment.findMany({
            where: { id: { in: commentIds } },
            select: { id: true, body: true, authorName: true },
          })
        : [],
      answerIds.length > 0
        ? prisma.followUpAnswer.findMany({
            where: { id: { in: answerIds } },
            select: { id: true, body: true, authorName: true },
          })
        : [],
    ]);

    const commentMap = new Map(comments.map((c) => [c.id, c]));
    const answerMap = new Map(answers.map((a) => [a.id, a]));

    const result = events.map((evt) => {
      const meta = (evt.metadata ?? {}) as Record<string, unknown>;
      let feedbackBody: string | null = null;
      let feedbackAuthor: string | null = null;

      if (
        evt.type === "CLIENT_COMMENT_ADDED" &&
        typeof meta.commentId === "string"
      ) {
        const c = commentMap.get(meta.commentId);
        if (c) {
          feedbackBody = c.body;
          feedbackAuthor = c.authorName;
        }
      } else if (
        evt.type === "CLIENT_ANSWER_ADDED" &&
        typeof meta.answerId === "string"
      ) {
        const a = answerMap.get(meta.answerId);
        if (a) {
          feedbackBody = a.body;
          feedbackAuthor = a.authorName;
        }
      }

      return {
        id: evt.id,
        type: evt.type,
        actorType: evt.actorType,
        summary: evt.summary,
        createdAt: evt.createdAt.toISOString(),
        snapshotId: evt.snapshotId,
        version: evt.snapshot?.version ?? null,
        snapshotStatus: evt.snapshot?.status ?? null,
        trigger: typeof meta.trigger === "string" ? meta.trigger : null,
        userMessage:
          typeof meta.userMessage === "string" ? meta.userMessage : null,
        selectionText:
          typeof meta.selectionText === "string" ? meta.selectionText : null,
        feedbackBody,
        feedbackAuthor,
      };
    });

    return NextResponse.json({ revisions: result });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error({ scope: "api.sessions.revisions", error });
    return NextResponse.json(
      { error: "FETCH_FAILED", message: "Failed to fetch revisions." },
      { status: 500 },
    );
  }
}
