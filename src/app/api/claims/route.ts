import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

import { BriefClaimSection } from "../../../../generated/prisma/client";

const postSchema = z.object({
  snapshotId: z.string(),
  section: z.nativeEnum(BriefClaimSection),
  orderIndex: z.number().int().min(0),
  text: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const auth = await requireInternalAuth();
    const body = postSchema.parse(await request.json());

    const snapshot = await prisma.briefSnapshot.findUnique({
      where: { id: body.snapshotId },
      select: { id: true, createdBy: true },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Snapshot not found." }, { status: 404 });
    }

    if (snapshot.createdBy !== auth.clerkUserId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Not your brief." }, { status: 403 });
    }

    // Shift claims up in descending order so we never create a transient duplicate
    // that would violate the (snapshotId, section, orderIndex) unique constraint.
    await prisma.$executeRaw`
      UPDATE "BriefClaim"
      SET "orderIndex" = "orderIndex" + 1
      WHERE "snapshotId" = ${body.snapshotId}
        AND "section" = ${body.section}::"BriefClaimSection"
        AND "orderIndex" >= ${body.orderIndex}
      ORDER BY "orderIndex" DESC
    `;

    const claim = await prisma.briefClaim.create({
      data: {
        snapshotId: body.snapshotId,
        section: body.section,
        orderIndex: body.orderIndex,
        text: body.text,
        confidence: "MEDIUM",
      },
      select: { id: true, text: true, section: true, orderIndex: true, confidence: true },
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid body." }, { status: 400 });
    }
    console.error({ scope: "api.claims.post", error });
    return NextResponse.json({ error: "CREATE_FAILED", message: "Failed to create claim." }, { status: 500 });
  }
}
