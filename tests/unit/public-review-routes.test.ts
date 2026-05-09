import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class HoistedPublicRateLimitError extends Error {
    readonly status = 429;

    constructor(readonly retryAfterSeconds: number) {
      super("Too many public review requests.");
      this.name = "PublicRateLimitError";
    }
  }

  class HoistedPublicShareLinkNotFoundError extends Error {
    constructor() {
      super("Public brief link not found.");
      this.name = "PublicShareLinkNotFoundError";
    }
  }

  class HoistedPublicReviewReadOnlyError extends Error {
    constructor(message = "Snapshot is read-only for public review: CONFIRMED") {
      super(message);
      this.name = "PublicReviewReadOnlyError";
    }
  }

  class HoistedPublicReviewValidationError extends Error {
    constructor(message = "Invalid public review request.") {
      super(message);
      this.name = "PublicReviewValidationError";
    }
  }

  return {
    assertPublicMutationRateLimit: vi.fn(),
    getRequestClientIp: vi.fn(() => "203.0.113.50"),
    createPublicComment: vi.fn(),
    createPublicFollowUpAnswer: vi.fn(),
    confirmPublicBrief: vi.fn(),
    PublicRateLimitError: HoistedPublicRateLimitError,
    PublicShareLinkNotFoundError: HoistedPublicShareLinkNotFoundError,
    PublicReviewReadOnlyError: HoistedPublicReviewReadOnlyError,
    PublicReviewValidationError: HoistedPublicReviewValidationError,
  };
});

vi.mock("@/server/auth/public", () => ({
  assertPublicMutationRateLimit: mocks.assertPublicMutationRateLimit,
  getRequestClientIp: mocks.getRequestClientIp,
  PublicRateLimitError: mocks.PublicRateLimitError,
}));

vi.mock("@/server/services/public-review", () => ({
  createPublicComment: mocks.createPublicComment,
  createPublicFollowUpAnswer: mocks.createPublicFollowUpAnswer,
  confirmPublicBrief: mocks.confirmPublicBrief,
  PublicShareLinkNotFoundError: mocks.PublicShareLinkNotFoundError,
  PublicReviewReadOnlyError: mocks.PublicReviewReadOnlyError,
  PublicReviewValidationError: mocks.PublicReviewValidationError,
}));

import { POST as postAnswer } from "@/app/api/public/briefs/[shareToken]/answers/route";
import { POST as postComment } from "@/app/api/public/briefs/[shareToken]/comments/route";
import { POST as postConfirm } from "@/app/api/public/briefs/[shareToken]/confirm/route";

function buildRequest(body: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.50",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
  mocks.assertPublicMutationRateLimit.mockReset();
  mocks.getRequestClientIp.mockReset();
  mocks.getRequestClientIp.mockReturnValue("203.0.113.50");
  mocks.createPublicComment.mockReset();
  mocks.createPublicFollowUpAnswer.mockReset();
  mocks.confirmPublicBrief.mockReset();
});

describe("public comment route", () => {
  it("creates comments for valid payloads", async () => {
    mocks.createPublicComment.mockResolvedValueOnce({ id: "comment_1" });

    const response = await postComment(buildRequest({
      section: "SUMMARY",
      anchorType: "SECTION",
      authorEmail: "Client@Example.com",
      body: "Please clarify this item.",
    }), {
      params: Promise.resolve({ shareToken: "token-1" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.assertPublicMutationRateLimit).toHaveBeenCalledWith({
      action: "comment",
      ip: "203.0.113.50",
      shareToken: "token-1",
    });
    expect(mocks.createPublicComment).toHaveBeenCalledWith("token-1", {
      section: "SUMMARY",
      anchorType: "SECTION",
      authorEmail: "client@example.com",
      body: "Please clarify this item.",
    });
    await expect(readJson(response)).resolves.toEqual({
      comment: { id: "comment_1" },
    });
  });

  it("returns 400 for invalid request bodies", async () => {
    const response = await postComment(buildRequest({
      section: "SUMMARY",
      anchorType: "CLAIM",
      body: "Missing claim ID",
    }), {
      params: Promise.resolve({ shareToken: "token-2" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.createPublicComment).not.toHaveBeenCalled();
  });

  it("returns 429 for rate-limited requests", async () => {
    mocks.assertPublicMutationRateLimit.mockImplementationOnce(() => {
      throw new mocks.PublicRateLimitError(42);
    });

    const response = await postComment(buildRequest({
      section: "SUMMARY",
      anchorType: "SECTION",
      body: "Rate limited",
    }), {
      params: Promise.resolve({ shareToken: "token-3" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
  });

  it("returns mapped service errors", async () => {
    mocks.createPublicComment.mockRejectedValueOnce(
      new mocks.PublicReviewValidationError("Bad target."),
    );

    const response = await postComment(buildRequest({
      section: "SUMMARY",
      anchorType: "SECTION",
      body: "Bad target",
    }), {
      params: Promise.resolve({ shareToken: "token-4" }),
    });

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "Bad target." });
  });
});

describe("public answer route", () => {
  it("creates answers for valid payloads", async () => {
    mocks.createPublicFollowUpAnswer.mockResolvedValueOnce({ id: "answer_1" });

    const response = await postAnswer(buildRequest({
      questionId: "550e8400-e29b-41d4-a716-446655440010",
      authorEmail: "Client@Example.com",
      body: "Store managers and supervisors.",
    }), {
      params: Promise.resolve({ shareToken: "token-5" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.assertPublicMutationRateLimit).toHaveBeenCalledWith({
      action: "answer",
      ip: "203.0.113.50",
      shareToken: "token-5",
    });
    expect(mocks.createPublicFollowUpAnswer).toHaveBeenCalledWith("token-5", {
      questionId: "550e8400-e29b-41d4-a716-446655440010",
      authorEmail: "client@example.com",
      body: "Store managers and supervisors.",
    });
    await expect(readJson(response)).resolves.toEqual({
      answer: { id: "answer_1" },
    });
  });

  it("returns 404 when the share link is missing", async () => {
    mocks.createPublicFollowUpAnswer.mockRejectedValueOnce(
      new mocks.PublicShareLinkNotFoundError(),
    );

    const response = await postAnswer(buildRequest({
      questionId: "550e8400-e29b-41d4-a716-446655440011",
      body: "Answer text",
    }), {
      params: Promise.resolve({ shareToken: "token-6" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 409 for read-only snapshots", async () => {
    mocks.createPublicFollowUpAnswer.mockRejectedValueOnce(
      new mocks.PublicReviewReadOnlyError(),
    );

    const response = await postAnswer(buildRequest({
      questionId: "550e8400-e29b-41d4-a716-446655440012",
      body: "Answer text",
    }), {
      params: Promise.resolve({ shareToken: "token-7" }),
    });

    expect(response.status).toBe(409);
  });
});

describe("public confirm route", () => {
  it("confirms briefs for valid payloads", async () => {
    mocks.confirmPublicBrief.mockResolvedValueOnce({
      id: "snapshot_1",
      status: "CONFIRMED",
    });

    const response = await postConfirm(buildRequest({
      authorName: "Demo Client",
    }), {
      params: Promise.resolve({ shareToken: "token-8" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.assertPublicMutationRateLimit).toHaveBeenCalledWith({
      action: "confirm",
      ip: "203.0.113.50",
      shareToken: "token-8",
    });
    expect(mocks.confirmPublicBrief).toHaveBeenCalledWith("token-8", {
      authorName: "Demo Client",
    });
    await expect(readJson(response)).resolves.toEqual({
      snapshot: { id: "snapshot_1", status: "CONFIRMED" },
    });
  });

  it("returns 400 for invalid confirmation payloads", async () => {
    const response = await postConfirm(buildRequest({
      authorEmail: "invalid-email",
    }), {
      params: Promise.resolve({ shareToken: "token-9" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.confirmPublicBrief).not.toHaveBeenCalled();
  });

  it("returns 500 for unexpected confirmation failures", async () => {
    mocks.confirmPublicBrief.mockRejectedValueOnce(new Error("boom"));

    const response = await postConfirm(buildRequest({}), {
      params: Promise.resolve({ shareToken: "token-10" }),
    });

    expect(response.status).toBe(500);
  });
});
