import { describe, expect, it, vi } from "vitest";

import {
  confirmPublicBrief,
  createPublicComment,
  createPublicFollowUpAnswer,
  PublicReviewReadOnlyError,
  PublicReviewValidationError,
  PublicShareLinkNotFoundError,
} from "@/server/services/public-review";

const mockTx = {
  shareLink: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  briefClaim: {
    findUnique: vi.fn(),
  },
  briefQuestion: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  briefComment: {
    create: vi.fn(),
  },
  followUpAnswer: {
    create: vi.fn(),
  },
  briefSnapshot: {
    update: vi.fn(),
  },
  revisionEvent: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) =>
      callback(mockTx),
    ),
  },
}));

function activeSharedLinkSnapshot() {
  return {
    id: "share_link_1",
    status: "ACTIVE",
    expiresAt: null,
    snapshotId: "snapshot_1",
    snapshot: {
      id: "snapshot_1",
      status: "SHARED",
      projectId: "project_1",
      sessionId: "session_1",
    },
  };
}

function resetPublicReviewMocks() {
  mockTx.shareLink.findUnique.mockReset();
  mockTx.shareLink.update.mockReset();
  mockTx.briefClaim.findUnique.mockReset();
  mockTx.briefQuestion.findUnique.mockReset();
  mockTx.briefQuestion.update.mockReset();
  mockTx.briefComment.create.mockReset();
  mockTx.followUpAnswer.create.mockReset();
  mockTx.briefSnapshot.update.mockReset();
  mockTx.revisionEvent.create.mockReset();
}

describe("createPublicComment", () => {
  it("creates a client comment for an active shared link", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(
      activeSharedLinkSnapshot(),
    );
    mockTx.briefClaim.findUnique.mockResolvedValueOnce({
      id: "claim_1",
      snapshotId: "snapshot_1",
      section: "SUMMARY",
    });
    mockTx.briefComment.create.mockResolvedValueOnce({ id: "comment_1" });

    const result = await createPublicComment("demo-token", {
      section: "SUMMARY",
      anchorType: "CLAIM",
      claimId: "claim_1",
      authorEmail: "Client@Example.com",
      body: "Please keep Arabic support explicit.",
    });

    expect(mockTx.briefComment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        snapshotId: "snapshot_1",
        claimId: "claim_1",
        questionId: null,
        authorEmail: "client@example.com",
      }),
    });
    expect(mockTx.revisionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "CLIENT_COMMENT_ADDED",
        actorType: "CLIENT",
        actorId: "client@example.com",
      }),
    });
    expect(result).toEqual({ id: "comment_1" });
  });

  it("rejects comments on non-shared snapshots", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce({
      ...activeSharedLinkSnapshot(),
      snapshot: {
        ...activeSharedLinkSnapshot().snapshot,
        status: "CONFIRMED",
      },
    });

    await expect(
      createPublicComment("demo-token", {
        section: "SUMMARY",
        anchorType: "SECTION",
        body: "Late comment",
      }),
    ).rejects.toBeInstanceOf(PublicReviewReadOnlyError);
  });

  it("falls back to share-link actor attribution when email is absent", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(
      activeSharedLinkSnapshot(),
    );
    mockTx.briefComment.create.mockResolvedValueOnce({ id: "comment_1" });

    await createPublicComment("demo-token", {
      section: "GOALS",
      anchorType: "SECTION",
      body: "Please make the admin goal clearer.",
    });

    expect(mockTx.revisionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: "share-link:share_link_1",
      }),
    });
  });
});

describe("createPublicFollowUpAnswer", () => {
  it("creates an answer and marks open questions as answered", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(
      activeSharedLinkSnapshot(),
    );
    mockTx.briefQuestion.findUnique.mockResolvedValueOnce({
      id: "question_1",
      snapshotId: "snapshot_1",
      section: "FOLLOW_UP_QUESTIONS",
      status: "OPEN",
    });
    mockTx.followUpAnswer.create.mockResolvedValueOnce({ id: "answer_1" });

    const result = await createPublicFollowUpAnswer("demo-token", {
      questionId: "question_1",
      body: "Branch supervisors need access too.",
    });

    expect(mockTx.followUpAnswer.create).toHaveBeenCalled();
    expect(mockTx.briefQuestion.update).toHaveBeenCalledWith({
      where: { id: "question_1" },
      data: { status: "ANSWERED" },
    });
    expect(mockTx.revisionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "CLIENT_ANSWER_ADDED",
        actorType: "CLIENT",
      }),
    });
    expect(result).toEqual({ id: "answer_1" });
  });

  it("rejects answers for questions outside the shared snapshot", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(
      activeSharedLinkSnapshot(),
    );
    mockTx.briefQuestion.findUnique.mockResolvedValueOnce({
      id: "question_1",
      snapshotId: "snapshot_other",
      section: "FOLLOW_UP_QUESTIONS",
      status: "OPEN",
    });

    await expect(
      createPublicFollowUpAnswer("demo-token", {
        questionId: "question_1",
        body: "Answer text",
      }),
    ).rejects.toBeInstanceOf(PublicReviewValidationError);
  });
});

describe("confirmPublicBrief", () => {
  it("confirms shared snapshots and records a client revision event", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(
      activeSharedLinkSnapshot(),
    );
    mockTx.briefSnapshot.update.mockResolvedValueOnce({
      id: "snapshot_1",
      status: "CONFIRMED",
    });

    const result = await confirmPublicBrief("demo-token", {
      authorName: "Demo Client",
    });

    expect(mockTx.briefSnapshot.update).toHaveBeenCalledWith({
      where: { id: "snapshot_1" },
      data: { status: "CONFIRMED" },
      select: { id: true, status: true },
    });
    expect(mockTx.revisionEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "BRIEF_CONFIRMED",
        actorType: "CLIENT",
        actorId: "share-link:share_link_1",
      }),
    });
    expect(result).toEqual({
      id: "snapshot_1",
      status: "CONFIRMED",
      sessionId: "session_1",
    });
  });

  it("treats already-confirmed snapshots as idempotent", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce({
      ...activeSharedLinkSnapshot(),
      snapshot: {
        ...activeSharedLinkSnapshot().snapshot,
        status: "CONFIRMED",
      },
    });

    const result = await confirmPublicBrief("demo-token", {});

    expect(mockTx.briefSnapshot.update).not.toHaveBeenCalled();
    expect(mockTx.revisionEvent.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: "snapshot_1",
      status: "CONFIRMED",
      sessionId: "session_1",
    });
  });

  it("rejects invalid public links", async () => {
    resetPublicReviewMocks();
    mockTx.shareLink.findUnique.mockResolvedValueOnce(null);

    await expect(
      confirmPublicBrief("missing-token", {}),
    ).rejects.toBeInstanceOf(PublicShareLinkNotFoundError);
  });
});
