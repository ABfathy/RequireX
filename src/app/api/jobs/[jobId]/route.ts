import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";

type RouteContext = { params: Promise<{ jobId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { jobId } = await params;

    const job = await prisma.processingJob.findUnique({
      where: { id: jobId },
      select: { id: true, status: true, errorCode: true, errorMessage: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error({ scope: "api.jobs.get", err });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
