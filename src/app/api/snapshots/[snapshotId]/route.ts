import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { snapshotToDocLines } from "@/lib/snapshot-to-doclines";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import { getSnapshotById } from "@/server/services/snapshot";

type RouteContext = { params: Promise<{ snapshotId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { snapshotId } = await params;

    const snapshot = await getSnapshotById(snapshotId);
    if (!snapshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await prisma.intakeSession.findUnique({
      where: { id: snapshot.sessionId },
      select: { title: true },
    });

    const lines = snapshotToDocLines(snapshot, session?.title ?? null);
    return NextResponse.json({ lines, version: snapshot.version });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
