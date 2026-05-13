import { NextRequest, NextResponse } from "next/server";

import {
  isInternalAuthorizationError,
  requireInternalActor,
} from "@/server/auth";
import {
  createShareLink,
  revokeShareLink,
  ShareLinkNotFoundError,
  ShareLinkSnapshotForbiddenError,
  ShareLinkSnapshotNotFoundError,
} from "@/server/services/share-link";

type RouteContext = { params: Promise<{ snapshotId: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const actor = await requireInternalActor();
    const { snapshotId } = await params;

    const shareLink = await createShareLink({
      snapshotId,
      clerkUserId: actor.clerkUserId,
    });

    const origin = req.nextUrl.origin;
    const url = `${origin}/brief/${shareLink.token}`;

    return NextResponse.json({ token: shareLink.token, url });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof ShareLinkSnapshotNotFoundError) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 },
      );
    }
    if (err instanceof ShareLinkSnapshotForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error({ scope: "api.snapshots.share.post", err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const actor = await requireInternalActor();
    await params; // resolve params even though snapshotId unused here

    const { searchParams } = req.nextUrl;
    const shareLinkId = searchParams.get("shareLinkId");

    if (!shareLinkId) {
      return NextResponse.json(
        { error: "shareLinkId query param required" },
        { status: 400 },
      );
    }

    await revokeShareLink({ shareLinkId, clerkUserId: actor.clerkUserId });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isInternalAuthorizationError(err)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (err instanceof ShareLinkNotFoundError) {
      return NextResponse.json(
        { error: "Share link not found" },
        { status: 404 },
      );
    }
    if (err instanceof ShareLinkSnapshotForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error({ scope: "api.snapshots.share.delete", err });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
