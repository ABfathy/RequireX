import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

const patchSchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  try {
    const auth = await requireInternalAuth();
    const { claimId } = await params;
    const body = patchSchema.parse(await request.json());

    const claim = await prisma.briefClaim.findUnique({
      where: { id: claimId },
      select: { id: true, snapshot: { select: { createdBy: true } } },
    });

    if (!claim) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Claim not found." }, { status: 404 });
    }

    if (claim.snapshot.createdBy !== auth.clerkUserId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Not your brief." }, { status: 403 });
    }

    const updated = await prisma.briefClaim.update({
      where: { id: claimId },
      data: { text: body.text },
      select: { id: true, text: true, section: true, confidence: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid body." }, { status: 400 });
    }
    console.error({ scope: "api.claims.patch", error });
    return NextResponse.json({ error: "UPDATE_FAILED", message: "Failed to update claim." }, { status: 500 });
  }
}
