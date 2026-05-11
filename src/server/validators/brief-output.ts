import { z } from "zod";

const EvidenceSchema = z.object({
  sourceAssetId: z.string().min(1),
  excerpt: z.string().min(1).max(500),
});

const ClaimSchema = z.object({
  text: z.string().min(1).max(2_000),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidence: z.array(EvidenceSchema).min(1).max(5),
});

const QuestionSchema = z.object({
  text: z.string().min(1).max(2_000),
  reason: z.string().min(1).max(2_000),
  evidence: z.array(EvidenceSchema).max(5).default([]),
});

export const BriefOutputSchema = z.object({
  summary: z.array(ClaimSchema).max(8),
  goals: z.array(ClaimSchema).max(8),
  ambiguities: z.array(QuestionSchema).max(6).default([]),
  followUpQuestions: z.array(QuestionSchema).max(6).default([]),
});

export type BriefOutput = z.infer<typeof BriefOutputSchema>;
export type BriefClaimOutput = z.infer<typeof ClaimSchema>;
export type BriefQuestionOutput = z.infer<typeof QuestionSchema>;
export type BriefEvidenceOutput = z.infer<typeof EvidenceSchema>;
