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

    const result = events.map((evt) => {
      const meta = (evt.metadata ?? {}) as Record<string, unknown>;
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
        userMessage: typeof meta.userMessage === "string" ? meta.userMessage : null,
        selectionText: typeof meta.selectionText === "string" ? meta.selectionText : null,
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
