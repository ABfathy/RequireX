import { NextRequest, NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  getSessionAssets,
  persistTextAsset,
} from "@/server/services/assets";
import { TextAssetInputSchema } from "@/server/validators/assets";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;
    const assets = await getSessionAssets(sessionId);
    return NextResponse.json({ assets });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;

    const body = await req.json();
    const parsed = TextAssetInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const asset = await persistTextAsset({
      sessionId,
      textContent: parsed.data.textContent,
      displayLabel: parsed.data.displayLabel,
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
