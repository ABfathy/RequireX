import { GoogleGenAI, Type } from "@google/genai";

import { serverEnv } from "@/lib/env/server";
import { BriefOutputSchema } from "@/server/validators/brief-output";

const MODEL = "gemini-2.5-flash";

let cachedClient: GoogleGenAI | null = null;

export type SourceBundleAsset = {
  id: string;
  label: string;
  text: string;
};

export type SourceBundle = {
  assets: SourceBundleAsset[];
};

const responseJsonSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          confidence: {
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH"],
          },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "confidence", "evidence"],
      },
    },
    goals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          confidence: {
            type: Type.STRING,
            enum: ["LOW", "MEDIUM", "HIGH"],
          },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "confidence", "evidence"],
      },
    },
    ambiguities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "reason", "evidence"],
      },
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceAssetId: { type: Type.STRING },
                excerpt: { type: Type.STRING },
              },
              required: ["sourceAssetId", "excerpt"],
            },
          },
        },
        required: ["text", "reason", "evidence"],
      },
    },
  },
  required: ["summary", "goals", "ambiguities", "followUpQuestions"],
} as const;

const SYSTEM_PROMPT = `You are a senior product analyst building a structured brief from raw client intake material.

You will receive one or more SOURCE blocks delimited like:
[SOURCE id="<sourceAssetId>" label="<label>"]
<source text>
[/SOURCE]

Produce a JSON object with exactly these top-level keys:
- "summary": array of claim objects
- "goals": array of claim objects
- "ambiguities": array of question objects
- "followUpQuestions": array of question objects

Each claim object has "text", "confidence", and non-empty "evidence".
Each question object has "text", "reason", and "evidence" which may be empty.
Evidence items use { "sourceAssetId": <one of the provided source ids>, "excerpt": <short verbatim quote> }.

Rules:
- Use only sourceAssetId values from the SOURCE blocks.
- Cap each section at 5 items.
- Prefer HIGH confidence only when the source material clearly supports it.
- Excerpts must be short and copied from the cited source.
- Output JSON only.`;

export class GoogleGenAIConfigError extends Error {
  readonly code = "VERTEX_CONFIG_MISSING";

  constructor(message: string) {
    super(message);
    this.name = "GoogleGenAIConfigError";
  }
}

function getClient() {
  if (cachedClient) return cachedClient;
  if (!serverEnv.GOOGLE_CLOUD_PROJECT || !serverEnv.GOOGLE_CLOUD_LOCATION) {
    throw new GoogleGenAIConfigError(
      "GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION are required for brief generation.",
    );
  }

  cachedClient = new GoogleGenAI({
    vertexai: true,
    project: serverEnv.GOOGLE_CLOUD_PROJECT,
    location: serverEnv.GOOGLE_CLOUD_LOCATION,
  });
  return cachedClient;
}

function buildPrompt(bundle: SourceBundle, retryHint?: string) {
  const sourceText = bundle.assets
    .map(
      (asset) =>
        `[SOURCE id="${asset.id}" label="${asset.label.replace(/"/g, '\\"')}"]\n${asset.text}\n[/SOURCE]`,
    )
    .join("\n\n");

  const validIds = bundle.assets.map((asset) => `- ${asset.id}`).join("\n");
  const retryText = retryHint
    ? `\n\nYour previous response was invalid: ${retryHint}\nReturn only corrected JSON.`
    : "";

  return `Use only these sourceAssetId values in evidence:\n${validIds}\n\n${sourceText}${retryText}`;
}

function extractJson(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("Model output was not valid JSON.");
  }
}

export async function generateBriefFromBundle(
  bundle: SourceBundle,
  retryHint?: string,
) {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: buildPrompt(bundle, retryHint),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Model returned an empty response.");
  }

  return BriefOutputSchema.parse(extractJson(rawText));
}
