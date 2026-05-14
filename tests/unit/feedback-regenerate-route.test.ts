import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireInternalAuth: vi.fn(),
  runBriefRevision: vi.fn(),
  briefSnapshotFindFirst: vi.fn(),
  followUpAnswerFindMany: vi.fn(),
  briefCommentFindMany: vi.fn(),
}));

vi.mock("@/server/auth/internal", () => ({
  requireInternalAuth: mocks.requireInternalAuth,
  isInternalAuthorizationError: vi.fn(() => false),
}));

vi.mock("@/server/services/brief-revision", () => ({
  BriefPipelineError: class BriefPipelineError extends Error {},
  runBriefRevision: mocks.runBriefRevision,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    briefSnapshot: {
      findFirst: mocks.briefSnapshotFindFirst,
    },
    followUpAnswer: {
      findMany: mocks.followUpAnswerFindMany,
    },
    briefComment: {
      findMany: mocks.briefCommentFindMany,
    },
  },
}));

import { POST } from "@/app/api/sessions/[sessionId]/regenerate-from-feedback/route";

describe("feedback regenerate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireInternalAuth.mockResolvedValue({
      clerkUserId: "user_123",
      clerkSessionId: "sess_123",
    });
    mocks.briefSnapshotFindFirst.mockResolvedValue({ id: "snapshot_1" });
    mocks.followUpAnswerFindMany.mockResolvedValue([
      {
        body: "Use Arabic and English.",
        question: { text: "Which languages are required?" },
      },
    ]);
    mocks.briefCommentFindMany.mockResolvedValue([
      {
        section: "SUMMARY",
        body: "Please make offline mode explicit.",
        authorName: "Demo Client",
      },
    ]);
    mocks.runBriefRevision.mockResolvedValue({
      snapshotId: "snapshot_2",
      version: 2,
    });
  });

  it("passes the authenticated user id into runBriefRevision", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        snapshotId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({
        sessionId: "550e8400-e29b-41d4-a716-446655440001",
      }),
    });

    expect(response.status).toBe(200);
    expect(mocks.runBriefRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: "user_123",
      }),
    );
  });
});
