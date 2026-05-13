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

    const claim = await prisma.$transaction(async (tx) => {
      // PostgreSQL checks unique constraints after each individual row update, so a
      // plain updateMany would violate (snapshotId, section, orderIndex) when shifting
      // e.g. row 2→3 while row 3 still exists. Updating in DESC order (4→5, 3→4, 2→3)
      // ensures each increment lands on a free slot.
      const toShift = await tx.briefClaim.findMany({
        where: { snapshotId: body.snapshotId, section: body.section, orderIndex: { gte: body.orderIndex } },
        orderBy: { orderIndex: "desc" },
        select: { id: true, orderIndex: true },
      });
      for (const row of toShift) {
        await tx.briefClaim.update({ where: { id: row.id }, data: { orderIndex: row.orderIndex + 1 } });
      }
      return tx.briefClaim.create({
        data: { snapshotId: body.snapshotId, section: body.section, orderIndex: body.orderIndex, text: body.text, confidence: "MEDIUM" },
        select: { id: true, text: true, section: true, orderIndex: true, confidence: true },
      });
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
