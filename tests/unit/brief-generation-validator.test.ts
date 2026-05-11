import { describe, expect, it } from "vitest";

import { GeneratedBriefSchema } from "@/server/validators/brief-generation";

describe("GeneratedBriefSchema", () => {
  it("accepts the expected text-first brief contract", () => {
    const result = GeneratedBriefSchema.parse({
      summary: [
        {
          text: "The client needs a quote workflow.",
          confidence: "HIGH",
          evidence: [{ sourceChunkId: "chunk_1" }],
        },
      ],
      goals: [
        {
          text: "Reduce manual intake follow-up.",
          confidence: "MEDIUM",
          evidence: [{ sourceChunkId: "chunk_1", excerpt: "manual intake" }],
        },
      ],
      ambiguities: [],
      followUpQuestions: [
        {
          text: "Which CRM should receive the final brief?",
          reason: "The source mentions CRM sync without naming the system.",
          evidence: [{ sourceChunkId: "chunk_1" }],
        },
      ],
    });

    expect(result.summary[0]?.confidence).toBe("HIGH");
  });

  it("rejects invalid confidence values", () => {
    expect(() =>
      GeneratedBriefSchema.parse({
        summary: [
          {
            text: "A claim",
            confidence: "CERTAIN",
            evidence: [{ sourceChunkId: "chunk_1" }],
          },
        ],
        goals: [
          {
            text: "A goal",
            confidence: "LOW",
            evidence: [{ sourceChunkId: "chunk_1" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("requires at least one summary and goal claim", () => {
    expect(() =>
      GeneratedBriefSchema.parse({
        summary: [],
        goals: [],
        ambiguities: [],
        followUpQuestions: [],
      }),
    ).toThrow();
  });
});
