import { z } from "zod";

import {
  BriefCommentAnchorType,
  BriefCommentSection,
} from "../../../generated/prisma/client";
import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(max).optional());

const optionalEmail = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed.toLowerCase();
}, z.string().email().max(320).optional());

export const PublicCommentInputSchema = z
  .object({
    section: z.nativeEnum(BriefCommentSection),
    anchorType: z.nativeEnum(BriefCommentAnchorType),
    claimId: z.string().uuid().optional(),
    questionId: z.string().uuid().optional(),
    selectionText: optionalTrimmedString(500),
    authorName: optionalTrimmedString(120),
    authorEmail: optionalEmail,
    body: z.string().trim().min(1).max(5000),
  })
  .superRefine((input, ctx) => {
    if (input.anchorType === "CLAIM" && !input.claimId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "claimId is required when anchorType is CLAIM.",
        path: ["claimId"],
      });
    }

    if (input.anchorType === "QUESTION" && !input.questionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "questionId is required when anchorType is QUESTION.",
        path: ["questionId"],
      });
    }

    if (
      input.anchorType === "SECTION" &&
      (input.claimId || input.questionId || input.selectionText)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "SECTION comments cannot include claimId, questionId, or selectionText.",
      });
    }

    if (input.anchorType === "TEXT_RANGE" && !input.selectionText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "selectionText is required when anchorType is TEXT_RANGE.",
        path: ["selectionText"],
      });
    }

    if (input.claimId && input.questionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A comment can target either a claim or a question, not both.",
      });
    }
  });

export const PublicFollowUpAnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  authorName: optionalTrimmedString(120),
  authorEmail: optionalEmail,
  body: z.string().trim().min(1).max(5000),
});

export const PublicBriefConfirmInputSchema = z.object({
  authorName: optionalTrimmedString(120),
  authorEmail: optionalEmail,
});

export type PublicCommentInput = z.infer<typeof PublicCommentInputSchema>;
export type PublicFollowUpAnswerInput = z.infer<
  typeof PublicFollowUpAnswerInputSchema
>;
export type PublicBriefConfirmInput = z.infer<
  typeof PublicBriefConfirmInputSchema
>;
