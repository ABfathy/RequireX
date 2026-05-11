import { z } from "zod";

export const BriefEvidenceInputSchema = z.object({
  sourceChunkId: z.string().min(1),
  label: z.string().max(200).optional(),
  excerpt: z.string().max(1_000).optional(),
});

export const BriefClaimInputSchema = z.object({
  text: z.string().min(1).max(2_000),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidence: z.array(BriefEvidenceInputSchema).default([]),
});

export const BriefQuestionInputSchema = z.object({
  text: z.string().min(1).max(2_000),
  reason: z.string().min(1).max(2_000),
  evidence: z.array(BriefEvidenceInputSchema).default([]),
});

export const GeneratedBriefSchema = z.object({
  summary: z.array(BriefClaimInputSchema).min(1),
  goals: z.array(BriefClaimInputSchema).min(1),
  ambiguities: z.array(BriefQuestionInputSchema).default([]),
  followUpQuestions: z.array(BriefQuestionInputSchema).default([]),
});

export type GeneratedBrief = z.infer<typeof GeneratedBriefSchema>;
export type GeneratedBriefEvidence = z.infer<typeof BriefEvidenceInputSchema>;
