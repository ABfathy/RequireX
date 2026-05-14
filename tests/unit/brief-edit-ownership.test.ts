import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireInternalAuth: vi.fn(),
  claimFindUnique: vi.fn(),
  claimUpdate: vi.fn(),
  questionFindUnique: vi.fn(),
  questionUpdate: vi.fn(),
}));

vi.mock("@/server/auth/internal", () => ({
  requireInternalAuth: mocks.requireInternalAuth,
  isInternalAuthorizationError: vi.fn(() => false),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    briefClaim: {
      findUnique: mocks.claimFindUnique,
      update: mocks.claimUpdate,
    },
    briefQuestion: {
      findUnique: mocks.questionFindUnique,
      update: mocks.questionUpdate,
    },
  },
}));

import { PATCH as patchClaim } from "@/app/api/claims/[claimId]/route";
import { PATCH as patchQuestion } from "@/app/api/questions/[questionId]/route";

describe("brief edit ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireInternalAuth.mockResolvedValue({
      clerkUserId: "user_123",
      clerkSessionId: "sess_123",
    });
  });

  it("allows claim edits when the snapshot is owned by the current user", async () => {
    mocks.claimFindUnique.mockResolvedValue({
      id: "claim_1",
      snapshot: { createdBy: "user_123" },
    });
    mocks.claimUpdate.mockResolvedValue({
      id: "claim_1",
      text: "Updated claim",
      section: "SUMMARY",
      confidence: "MEDIUM",
    });

    const response = await patchClaim(
      new NextRequest("http://localhost/api/test", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Updated claim" }),
      }),
      { params: Promise.resolve({ claimId: "claim_1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.claimUpdate).toHaveBeenCalledWith({
      where: { id: "claim_1" },
      data: { text: "Updated claim" },
      select: { id: true, text: true, section: true, confidence: true },
    });
  });

  it("allows question edits when the snapshot is owned by the current user", async () => {
    mocks.questionFindUnique.mockResolvedValue({
      id: "question_1",
      snapshot: { createdBy: "user_123" },
    });
    mocks.questionUpdate.mockResolvedValue({
      id: "question_1",
      text: "Updated question",
      section: "FOLLOW_UP_QUESTIONS",
      status: "OPEN",
    });

    const response = await patchQuestion(
      new NextRequest("http://localhost/api/test", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Updated question" }),
      }),
      { params: Promise.resolve({ questionId: "question_1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.questionUpdate).toHaveBeenCalledWith({
      where: { id: "question_1" },
      data: { text: "Updated question" },
      select: { id: true, text: true, section: true, status: true },
    });
  });
});
