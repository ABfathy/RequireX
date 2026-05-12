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
  { params }: { params: Promise<{ questionId: string }> },
) {
  try {
    const auth = await requireInternalAuth();
    const { questionId } = await params;
    const body = patchSchema.parse(await request.json());

    const question = await prisma.briefQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, snapshot: { select: { createdBy: true } } },
    });

    if (!question) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Question not found." }, { status: 404 });
    }

    if (question.snapshot.createdBy !== auth.clerkUserId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "Not your brief." }, { status: 403 });
    }

    const updated = await prisma.briefQuestion.update({
      where: { id: questionId },
      data: { text: body.text },
      select: { id: true, text: true, section: true, status: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "INVALID_REQUEST", message: "Invalid body." }, { status: 400 });
    }
    console.error({ scope: "api.questions.patch", error });
    return NextResponse.json({ error: "UPDATE_FAILED", message: "Failed to update question." }, { status: 500 });
  }
}
