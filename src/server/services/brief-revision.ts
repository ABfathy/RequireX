import { prisma } from "@/lib/prisma";
import {
  BriefPipelineError,
  buildSourceBundle,
  ensureSourceChunks,
  loadPromptSourceAssets,
  persistSnapshot,
  pipelineErrorFromUnknown,
  type StreamEvent,
  textForPrompt,
} from "@/server/services/brief-pipeline";
import {
  extractJson,
  reviseBriefFromBundle,
  reviseBriefStreamFromBundle,
} from "@/server/services/google-genai";
import { processSessionFileSources } from "@/server/services/source-processing";
import { BriefOutputSchema } from "@/server/validators/brief-output";

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
  const ambiguityItems = snapshot.questions.filter(
    (q) => q.section === "AMBIGUITIES",
  );
  const followUpItems = snapshot.questions.filter(
    (q) => q.section === "FOLLOW_UP_QUESTIONS",
  );

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
    ambiguityItems.forEach((q) =>
      lines.push(`  - ${q.text} (reason: ${q.reason})`),
    );
  }
  if (followUpItems.length > 0) {
    lines.push("FOLLOW-UP QUESTIONS:");
    followUpItems.forEach((q) =>
      lines.push(`  - ${q.text} (reason: ${q.reason})`),
    );
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
    throw new BriefPipelineError(
      "SESSION_NOT_FOUND",
      "Intake session was not found.",
    );
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
    throw new BriefPipelineError(
      "SNAPSHOT_NOT_FOUND",
      "Brief snapshot was not found.",
    );
  }

  await processSessionFileSources({ sessionId, requestedBy });

  const initialAssets = await loadPromptSourceAssets(sessionId);
  const assetsWithText = initialAssets.filter((asset) =>
    textForPrompt(asset).trim(),
  );

  if (assetsWithText.length === 0) {
    throw new BriefPipelineError(
      "NO_SOURCES",
      "No text sources are available for this session.",
    );
  }

  const assets = await ensureSourceChunks(assetsWithText);
  const bundle = buildSourceBundle(assets);

  if (bundle.assets.length === 0) {
    throw new BriefPipelineError(
      "EMPTY_BUNDLE",
      "Source bundle was empty after assembly.",
    );
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

export async function* runBriefRevisionStream(
  input: RunBriefRevisionInput,
): AsyncGenerator<StreamEvent> {
  try {
    const session = await prisma.intakeSession.findUnique({
      where: { id: input.sessionId },
      select: { id: true, projectId: true },
    });

    if (!session) {
      throw new BriefPipelineError(
        "SESSION_NOT_FOUND",
        "Intake session was not found.",
      );
    }

    const snapshot = await prisma.briefSnapshot.findUnique({
      where: { id: input.snapshotId },
      select: {
        id: true,
        claims: { select: { section: true, text: true, confidence: true } },
        questions: { select: { section: true, text: true, reason: true } },
      },
    });

    if (!snapshot) {
      throw new BriefPipelineError(
        "SNAPSHOT_NOT_FOUND",
        "Brief snapshot was not found.",
      );
    }

    await processSessionFileSources({
      sessionId: input.sessionId,
      requestedBy: input.requestedBy,
    });

    const initialAssets = await loadPromptSourceAssets(input.sessionId);
    const assetsWithText = initialAssets.filter((asset) =>
      textForPrompt(asset).trim(),
    );

    if (assetsWithText.length === 0) {
      throw new BriefPipelineError(
        "NO_SOURCES",
        "No text sources are available for this session.",
      );
    }

    const assets = await ensureSourceChunks(assetsWithText);
    const bundle = buildSourceBundle(assets);

    if (bundle.assets.length === 0) {
      throw new BriefPipelineError(
        "EMPTY_BUNDLE",
        "Source bundle was empty after assembly.",
      );
    }

    const currentBriefSummary = serializeCurrentBrief(snapshot);

    let fullText = "";
    try {
      for await (const chunk of reviseBriefStreamFromBundle(
        bundle,
        currentBriefSummary,
        input.userMessage,
        input.selectionText,
      )) {
        fullText += chunk;
        yield { type: "token", text: chunk };
      }
    } catch (streamError) {
      throw pipelineErrorFromUnknown(streamError);
    }

    let output;
    try {
      output = BriefOutputSchema.parse(extractJson(fullText));
    } catch (parseError) {
      const hint = pipelineErrorFromUnknown(parseError).message;
      try {
        output = await reviseBriefFromBundle(
          bundle,
          currentBriefSummary,
          input.userMessage,
          input.selectionText,
          hint,
        );
      } catch (retryError) {
        throw pipelineErrorFromUnknown(retryError);
      }
    }

    if (output.summary.length === 0 && output.goals.length === 0) {
      throw new BriefPipelineError(
        "INVALID_MODEL_OUTPUT",
        "Revised brief was empty. Please try a more specific instruction.",
      );
    }

    const newSnapshot = await persistSnapshot({
      projectId: session.projectId,
      sessionId: input.sessionId,
      requestedBy: input.requestedBy,
      output,
      assets,
      revisionEvent: {
        type: "REGENERATED",
        actorType: "INTERNAL_USER",
        summary: `Revised brief via chat: "${input.userMessage.slice(0, 100)}${input.userMessage.length > 100 ? "…" : ""}"`,
        metadata: {
          trigger: "chat",
          userMessage: input.userMessage,
          selectionText: input.selectionText ?? null,
          selectedItemId: input.selectedItemId ?? null,
          sourceSnapshotId: input.snapshotId,
        },
      },
    });

    yield {
      type: "complete",
      snapshotId: newSnapshot.id,
      version: newSnapshot.version,
    };
  } catch (error) {
    const pipelineError = pipelineErrorFromUnknown(error);
    yield {
      type: "error",
      code: pipelineError.code,
      message: pipelineError.message,
    };
  }
}
