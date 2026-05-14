import { z } from "zod";

const EvidenceSchema = z.object({
  sourceAssetId: z.string().min(1),
  excerpt: z.string().min(1).max(500),
});

const ClaimSchema = z.object({
  text: z.string().min(1).max(4_000),
  confidence: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidence: z.array(EvidenceSchema).max(5).default([]),
});

const QuestionSchema = z.object({
  text: z.string().min(1).max(2_000),
  reason: z.string().min(1).max(2_000),
  evidence: z.array(EvidenceSchema).max(5).default([]),
});

export const BriefOutputSchema = z.object({
  summary: z.array(ClaimSchema).max(12),
  goals: z.array(ClaimSchema).max(12),
  ambiguities: z.array(QuestionSchema).max(4).default([]),
  followUpQuestions: z.array(QuestionSchema).max(4).default([]),
});

export const FinalizedDocumentOutputSchema = z.object({
  projectOverview: z.array(ClaimSchema).min(1).max(12),
  projectGoals: z.array(ClaimSchema).min(1).max(12),
  mainFeatures: z.array(ClaimSchema).min(1).max(16),
  functionalRequirements: z.array(ClaimSchema).min(1).max(24),
  nonFunctionalRequirements: z.array(ClaimSchema).min(1).max(16),
  userFlows: z.array(ClaimSchema).min(1).max(16),
});

export type BriefOutput = z.infer<typeof BriefOutputSchema>;
export type FinalizedDocumentOutput = z.infer<
  typeof FinalizedDocumentOutputSchema
>;
export type BriefClaimOutput = z.infer<typeof ClaimSchema>;
export type BriefQuestionOutput = z.infer<typeof QuestionSchema>;
export type BriefEvidenceOutput = z.infer<typeof EvidenceSchema>;
