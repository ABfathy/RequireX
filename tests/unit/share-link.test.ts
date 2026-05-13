import { describe, expect, it, vi } from "vitest";

import {
  createShareLink,
  revokeShareLink,
  ShareLinkNotFoundError,
  ShareLinkSnapshotForbiddenError,
  ShareLinkSnapshotNotFoundError,
} from "@/server/services/share-link";

const mockTx = {
  shareLink: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  briefSnapshot: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    briefSnapshot: { findUnique: vi.fn() },
    shareLink: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => unknown) =>
      cb(mockTx),
    ),
  },
}));

// Lazily import the mocked prisma so we can control its return values per-test.
async function getPrisma() {
  const { prisma } = await import("@/lib/prisma");
  return prisma as unknown as {
    briefSnapshot: { findUnique: ReturnType<typeof vi.fn> };
    shareLink: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
}

function makeSnapshot(override?: { status?: string; ownerUserId?: string }) {
  return {
    id: "snap_1",
    status: override?.status ?? "DRAFT",
    project: {
      workspace: { createdBy: override?.ownerUserId ?? "user_1" },
    },
  };
}

function makeShareLink() {
  return {
    id: "link_1",
    token: crypto.randomUUID(),
    snapshotId: "snap_1",
    status: "ACTIVE",
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "user_1",
  };
}

function resetMocks() {
  mockTx.shareLink.findFirst.mockReset();
  mockTx.shareLink.create.mockReset();
  mockTx.shareLink.update.mockReset();
  mockTx.briefSnapshot.update.mockReset();
}

describe("createShareLink", () => {
  it("creates a share link and transitions snapshot to SHARED", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.briefSnapshot.findUnique.mockResolvedValueOnce(makeSnapshot());
    mockTx.shareLink.findFirst.mockResolvedValueOnce(null);
    const created = makeShareLink();
    mockTx.shareLink.create.mockResolvedValueOnce(created);

    const result = await createShareLink({
      snapshotId: "snap_1",
      clerkUserId: "user_1",
    });

    expect(mockTx.briefSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snap_1" },
      data: { status: "SHARED" },
    });
    expect(mockTx.shareLink.create).toHaveBeenCalled();
    expect(result).toEqual(created);
  });

  it("is idempotent — returns existing ACTIVE link without creating a new one", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.briefSnapshot.findUnique.mockResolvedValueOnce(makeSnapshot());
    const existing = makeShareLink();
    mockTx.shareLink.findFirst.mockResolvedValueOnce(existing);

    const result = await createShareLink({
      snapshotId: "snap_1",
      clerkUserId: "user_1",
    });

    expect(mockTx.shareLink.create).not.toHaveBeenCalled();
    expect(result).toEqual(existing);
  });

  it("does not update snapshot status when already SHARED", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.briefSnapshot.findUnique.mockResolvedValueOnce(
      makeSnapshot({ status: "SHARED" }),
    );
    mockTx.shareLink.findFirst.mockResolvedValueOnce(null);
    mockTx.shareLink.create.mockResolvedValueOnce(makeShareLink());

    await createShareLink({ snapshotId: "snap_1", clerkUserId: "user_1" });

    expect(mockTx.briefSnapshot.update).not.toHaveBeenCalled();
  });

  it("throws ShareLinkSnapshotNotFoundError when snapshot missing", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.briefSnapshot.findUnique.mockResolvedValueOnce(null);

    await expect(
      createShareLink({ snapshotId: "snap_1", clerkUserId: "user_1" }),
    ).rejects.toThrow(ShareLinkSnapshotNotFoundError);
  });

  it("throws ShareLinkSnapshotForbiddenError when user does not own workspace", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.briefSnapshot.findUnique.mockResolvedValueOnce(
      makeSnapshot({ ownerUserId: "other_user" }),
    );

    await expect(
      createShareLink({ snapshotId: "snap_1", clerkUserId: "user_1" }),
    ).rejects.toThrow(ShareLinkSnapshotForbiddenError);
  });
});

describe("revokeShareLink", () => {
  it("sets share link status to REVOKED", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.shareLink.findUnique.mockResolvedValueOnce({
      id: "link_1",
      snapshot: { project: { workspace: { createdBy: "user_1" } } },
    });

    await revokeShareLink({ shareLinkId: "link_1", clerkUserId: "user_1" });

    expect(prisma.shareLink.update).toHaveBeenCalledWith({
      where: { id: "link_1" },
      data: { status: "REVOKED" },
    });
  });

  it("throws ShareLinkNotFoundError when link missing", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.shareLink.findUnique.mockResolvedValueOnce(null);

    await expect(
      revokeShareLink({ shareLinkId: "link_1", clerkUserId: "user_1" }),
    ).rejects.toThrow(ShareLinkNotFoundError);
  });

  it("throws ShareLinkSnapshotForbiddenError when user does not own workspace", async () => {
    resetMocks();
    const prisma = await getPrisma();
    prisma.shareLink.findUnique.mockResolvedValueOnce({
      id: "link_1",
      snapshot: { project: { workspace: { createdBy: "other_user" } } },
    });

    await expect(
      revokeShareLink({ shareLinkId: "link_1", clerkUserId: "user_1" }),
    ).rejects.toThrow(ShareLinkSnapshotForbiddenError);
  });
});
