import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env/server";
import { GeneratedBriefSchema } from "@/server/validators/brief-generation";

const MODEL = "gemini-2.5-flash";

export type SourceBundleChunk = {
  id: string;
  label: string;
  sourceLabel: string;
  text: string;
};

export type SourceBundle = {
  chunks: SourceBundleChunk[];
};

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "goals", "ambiguities", "followUpQuestions"],
  properties: {
    summary: { type: "array", items: { $ref: "#/$defs/claim" }, minItems: 1 },
    goals: { type: "array", items: { $ref: "#/$defs/claim" }, minItems: 1 },
    ambiguities: {
      type: "array",
      items: { $ref: "#/$defs/question" },
    },
    followUpQuestions: {
      type: "array",
      items: { $ref: "#/$defs/question" },
    },
  },
  $defs: {
    evidence: {
      type: "object",
      additionalProperties: false,
      required: ["sourceChunkId"],
      properties: {
        sourceChunkId: { type: "string" },
        label: { type: "string" },
        excerpt: { type: "string" },
      },
    },
    claim: {
      type: "object",
      additionalProperties: false,
      required: ["text", "confidence", "evidence"],
      properties: {
        text: { type: "string" },
        confidence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
        evidence: { type: "array", items: { $ref: "#/$defs/evidence" } },
      },
    },
    question: {
      type: "object",
      additionalProperties: false,
      required: ["text", "reason", "evidence"],
      properties: {
        text: { type: "string" },
        reason: { type: "string" },
        evidence: { type: "array", items: { $ref: "#/$defs/evidence" } },
      },
    },
  },
};

function assertVertexConfig() {
  if (!serverEnv.GOOGLE_CLOUD_PROJECT || !serverEnv.GOOGLE_CLOUD_LOCATION) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are required for brief generation.",
    );
  }
}

function buildPrompt(bundle: SourceBundle) {
  const sourceText = bundle.chunks
    .map(
      (chunk) =>
        `<chunk id="${chunk.id}" label="${chunk.label}" source="${chunk.sourceLabel}">\n${chunk.text}\n</chunk>`,
    )
    .join("\n\n");

  return `Create a concise project brief from the source chunks below.

Return JSON only. Use only these sourceChunkId values in evidence:
${bundle.chunks.map((chunk) => `- ${chunk.id}`).join("\n")}

Each summary and goal item must be a clear claim with LOW, MEDIUM, or HIGH confidence.
Ambiguities and follow-up questions should be questions the internal team should resolve before delivery.

Sources:
${sourceText}`;
}

export async function generateBriefFromBundle(bundle: SourceBundle) {
  assertVertexConfig();

  const ai = new GoogleGenAI({
    vertexai: true,
    project: serverEnv.GOOGLE_CLOUD_PROJECT,
    location: serverEnv.GOOGLE_CLOUD_LOCATION,
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(bundle),
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseJsonSchema,
      systemInstruction:
        "You transform messy client intake notes into structured, evidence-backed software project briefs.",
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Model returned an empty response.");
  }

  return GeneratedBriefSchema.parse(JSON.parse(rawText));
}
