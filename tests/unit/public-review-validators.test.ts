import { describe, expect, it } from "vitest";

import {
  PublicBriefConfirmInputSchema,
  PublicCommentInputSchema,
  PublicFollowUpAnswerInputSchema,
} from "@/server/validators";

describe("PublicCommentInputSchema", () => {
  it("normalizes optional author fields and accepts a claim-targeted comment", () => {
    const parsed = PublicCommentInputSchema.safeParse({
      section: "SUMMARY",
      anchorType: "CLAIM",
      claimId: "550e8400-e29b-41d4-a716-446655440000",
      authorName: "  Demo Client  ",
      authorEmail: " Client@Example.com ",
      body: "  Clarify this requirement.  ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.authorName).toBe("Demo Client");
    expect(parsed.data.authorEmail).toBe("client@example.com");
    expect(parsed.data.body).toBe("Clarify this requirement.");
  });

  it("requires selectionText for text-range comments", () => {
    const parsed = PublicCommentInputSchema.safeParse({
      section: "GOALS",
      anchorType: "TEXT_RANGE",
      body: "Need more detail here.",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects SECTION comments with targeted IDs", () => {
    const parsed = PublicCommentInputSchema.safeParse({
      section: "AMBIGUITIES",
      anchorType: "SECTION",
      questionId: "550e8400-e29b-41d4-a716-446655440001",
      body: "This should be section-level only.",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects comments that target both a claim and a question", () => {
    const parsed = PublicCommentInputSchema.safeParse({
      section: "FOLLOW_UP_QUESTIONS",
      anchorType: "QUESTION",
      claimId: "550e8400-e29b-41d4-a716-446655440002",
      questionId: "550e8400-e29b-41d4-a716-446655440003",
      body: "Only one target should be allowed.",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("PublicFollowUpAnswerInputSchema", () => {
  it("normalizes optional fields", () => {
    const parsed = PublicFollowUpAnswerInputSchema.safeParse({
      questionId: "550e8400-e29b-41d4-a716-446655440004",
      authorName: "  Demo Client  ",
      authorEmail: " CLIENT@example.com ",
      body: "  Store managers and supervisors.  ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      return;
    }

    expect(parsed.data.authorName).toBe("Demo Client");
    expect(parsed.data.authorEmail).toBe("client@example.com");
    expect(parsed.data.body).toBe("Store managers and supervisors.");
  });

  it("rejects invalid question IDs", () => {
    const parsed = PublicFollowUpAnswerInputSchema.safeParse({
      questionId: "not-a-uuid",
      body: "Answer text",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("PublicBriefConfirmInputSchema", () => {
  it("accepts an empty payload", () => {
    const parsed = PublicBriefConfirmInputSchema.safeParse({});

    expect(parsed.success).toBe(true);
  });

  it("rejects invalid emails", () => {
    const parsed = PublicBriefConfirmInputSchema.safeParse({
      authorEmail: "not-an-email",
    });

    expect(parsed.success).toBe(false);
  });
});
