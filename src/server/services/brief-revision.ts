import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import {
  reviseBriefFromBundle,
  GoogleGenAIConfigError,
} from "@/server/services/google-genai";
import {
  BriefPipelineError,
  buildSourceBundle,
  ensureTextChunks,
  loadTextAssets,
  persistSnapshot,
  pipelineErrorFromUnknown,
  textForPrompt,
} from "@/server/services/brief-pipeline";

export { BriefPipelineError };

export type RunBriefRevisionInput = {
  sessionId: string;
  snapshotId: string;
  userMessage: string;
  selectionText?: string;
  selectedItemId?: string;
  requestedBy: string;
};

function serializeCurrentBrief(snapshot: {
  claims: Array<{ section: string; text: string; confidence: string }>;
  questions: Array<{ section: string; text: string; reason: string }>;
}): string {
  const lines: string[] = [];

  const summaryItems = snapshot.claims.filter((c) => c.section === "SUMMARY");
  const goalItems = snapshot.claims.filter((c) => c.section === "GOALS");
  const ambiguityItems = snapshot.questions.filter((q) => q.section === "AMBIGUITIES");
  const followUpItems = snapshot.questions.filter((q) => q.section === "FOLLOW_UP_QUESTIONS");

  if (summaryItems.length > 0) {
    lines.push("SUMMARY:");
    summaryItems.forEach((c) => lines.push(`  - [${c.confidence}] ${c.text}`));
  }
  if (goalItems.length > 0) {
    lines.push("GOALS:");
    goalItems.forEach((c) => lines.push(`  - [${c.confidence}] ${c.text}`));
  }
  if (ambiguityItems.length > 0) {
    lines.push("AMBIGUITIES:");
    ambiguityItems.forEach((q) => lines.push(`  - ${q.text} (reason: ${q.reason})`));
  }
  if (followUpItems.length > 0) {
    lines.push("FOLLOW-UP QUESTIONS:");
    followUpItems.forEach((q) => lines.push(`  - ${q.text} (reason: ${q.reason})`));
  }

  return lines.join("\n");
}

export async function runBriefRevision({
  sessionId,
  snapshotId,
  userMessage,
  selectionText,
  selectedItemId,
  requestedBy,
}: RunBriefRevisionInput) {
  const session = await prisma.intakeSession.findUnique({
    where: { id: sessionId },
    select: { id: true, projectId: true },
  });

  if (!session) {
    throw new BriefPipelineError("SESSION_NOT_FOUND", "Intake session was not found.");
  }

  const snapshot = await prisma.briefSnapshot.findUnique({
    where: { id: snapshotId },
    select: {
      id: true,
      claims: { select: { section: true, text: true, confidence: true } },
      questions: { select: { section: true, text: true, reason: true } },
    },
  });

  if (!snapshot) {
    throw new BriefPipelineError("SNAPSHOT_NOT_FOUND", "Brief snapshot was not found.");
  }

  const initialAssets = await loadTextAssets(sessionId);
  const assetsWithText = initialAssets.filter((asset) => textForPrompt(asset).trim());

  if (assetsWithText.length === 0) {
    throw new BriefPipelineError(
      "NO_SOURCES",
      "No text sources are available for this session.",
    );
  }

  const assets = await ensureTextChunks(assetsWithText);
  const bundle = buildSourceBundle(assets);

  if (bundle.assets.length === 0) {
    throw new BriefPipelineError("EMPTY_BUNDLE", "Source bundle was empty after assembly.");
  }

  const currentBriefSummary = serializeCurrentBrief(snapshot);

  let output;
  try {
    output = await reviseBriefFromBundle(
      bundle,
      currentBriefSummary,
      userMessage,
      selectionText,
    );
  } catch (firstError) {
    const pipelineError = pipelineErrorFromUnknown(firstError);
    if (pipelineError.code !== "INVALID_MODEL_OUTPUT") throw pipelineError;
    try {
      output = await reviseBriefFromBundle(
        bundle,
        currentBriefSummary,
        userMessage,
        selectionText,
        pipelineError.message,
      );
    } catch (retryError) {
      throw pipelineErrorFromUnknown(retryError);
    }
  }

  // Validate output not empty — fall back to first error if model wiped the brief
  if (output.summary.length === 0 && output.goals.length === 0) {
    throw new BriefPipelineError(
      "INVALID_MODEL_OUTPUT",
      "Revised brief was empty. Please try a more specific instruction.",
    );
  }

  const newSnapshot = await persistSnapshot({
    projectId: session.projectId,
    sessionId,
    requestedBy,
    output,
    assets,
    revisionEvent: {
      type: "REGENERATED",
      actorType: "INTERNAL_USER",
      summary: `Revised brief via chat: "${userMessage.slice(0, 100)}${userMessage.length > 100 ? "…" : ""}"`,
      metadata: {
        trigger: "chat",
        userMessage,
        selectionText: selectionText ?? null,
        selectedItemId: selectedItemId ?? null,
        sourceSnapshotId: snapshotId,
      },
    },
  });

  return { snapshotId: newSnapshot.id, version: newSnapshot.version };
}
