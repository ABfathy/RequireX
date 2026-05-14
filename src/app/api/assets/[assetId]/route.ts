import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth";
import {
  AssetDeleteForbiddenError,
  AssetNotFoundError,
  deleteAsset,
  updateAssetLabel,
} from "@/server/services/assets";
import { UpdateLabelInputSchema } from "@/server/validators/assets";

type RouteContext = { params: Promise<{ assetId: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { assetId } = await params;
    const asset = await prisma.sourceAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        sourceType: true,
        mimeType: true,
        ufsUrl: true,
        textContent: true,
      },
    });
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ asset });
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

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { assetId } = await params;
    await deleteAsset(assetId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof AssetNotFoundError) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    if (err instanceof AssetDeleteForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { assetId } = await params;

    const body = await req.json();
    const parsed = UpdateLabelInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const asset = await updateAssetLabel(assetId, parsed.data.displayLabel);
    return NextResponse.json({ asset });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof AssetNotFoundError) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
