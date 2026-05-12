import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { snapshotToDocLines } from "@/lib/snapshot-to-doclines";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    await requireInternalAuth();
    const { snapshotId } = await params;

    const snapshot = await prisma.briefSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        claims: {
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
          include: {
            evidenceRefs: {
              orderBy: { createdAt: "asc" },
              include: {
                sourceAsset: {
                  select: { id: true, displayLabel: true, originalFileName: true },
                },
              },
            },
          },
        },
        questions: {
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
          include: {
            evidenceRefs: {
              orderBy: { createdAt: "asc" },
              include: {
                sourceAsset: {
                  select: { id: true, displayLabel: true, originalFileName: true },
                },
              },
            },
          },
        },
        session: { select: { title: true } },
      },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Snapshot not found." }, { status: 404 });
    }

    const lines = snapshotToDocLines(snapshot, snapshot.session.title);
    return NextResponse.json({ lines, version: snapshot.version, status: snapshot.status });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    console.error({ scope: "api.snapshots.get", error });
    return NextResponse.json({ error: "FETCH_FAILED", message: "Failed to fetch snapshot." }, { status: 500 });
  }
}
