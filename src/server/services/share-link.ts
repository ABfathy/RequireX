import { prisma } from "@/lib/prisma";

import {
  BriefSnapshotStatus,
  ShareLinkStatus,
} from "../../../generated/prisma/client";

export class ShareLinkSnapshotNotFoundError extends Error {
  constructor() {
    super("Snapshot not found.");
    this.name = "ShareLinkSnapshotNotFoundError";
  }
}

export class ShareLinkSnapshotForbiddenError extends Error {
  constructor() {
    super("You do not have permission to share this snapshot.");
    this.name = "ShareLinkSnapshotForbiddenError";
  }
}

export class ShareLinkNotFoundError extends Error {
  constructor() {
    super("Share link not found.");
    this.name = "ShareLinkNotFoundError";
  }
}

export async function createShareLink({
  snapshotId,
  clerkUserId,
}: {
  snapshotId: string;
  clerkUserId: string;
}) {
  const snapshot = await prisma.briefSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      status: true,
      project: {
        select: {
          workspace: {
            select: { createdBy: true },
          },
        },
      },
    },
  });

  if (!snapshot) throw new ShareLinkSnapshotNotFoundError();
  if (snapshot.project.workspace.createdBy !== clerkUserId) {
    throw new ShareLinkSnapshotForbiddenError();
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.shareLink.findFirst({
      where: { snapshotId, status: ShareLinkStatus.ACTIVE },
    });
    if (existing) return existing;

    if (snapshot.status === BriefSnapshotStatus.DRAFT) {
      await tx.briefSnapshot.update({
        where: { id: snapshotId },
        data: { status: BriefSnapshotStatus.SHARED },
      });
    }

    return tx.shareLink.create({
      data: {
        snapshotId,
        token: crypto.randomUUID(),
        createdBy: clerkUserId,
      },
    });
  });
}

export async function revokeShareLink({
  shareLinkId,
  clerkUserId,
}: {
  shareLinkId: string;
  clerkUserId: string;
}) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { id: shareLinkId },
    select: {
      id: true,
      snapshot: {
        select: {
          project: {
            select: {
              workspace: {
                select: { createdBy: true },
              },
            },
          },
        },
      },
    },
  });

  if (!shareLink) throw new ShareLinkNotFoundError();
  if (shareLink.snapshot.project.workspace.createdBy !== clerkUserId) {
    throw new ShareLinkSnapshotForbiddenError();
  }

  await prisma.shareLink.update({
    where: { id: shareLinkId },
    data: { status: ShareLinkStatus.REVOKED },
  });
}
