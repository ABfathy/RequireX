import { NextRequest, NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import { getAllSnapshots } from "@/server/services/snapshot";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;
    const snapshots = await getAllSnapshots(sessionId);
    return NextResponse.json({ snapshots });
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
