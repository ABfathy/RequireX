import type { DocLineData } from "@/components/editor/doc-view";
import type { SnapshotWithDetails } from "@/server/services/snapshot";

const SECTION_LABELS = {
  SUMMARY: "Summary",
  GOALS: "Goals",
  AMBIGUITIES: "Ambiguities",
  FOLLOW_UP_QUESTIONS: "Follow-up Questions",
} as const;

type EvidenceRow =
  SnapshotWithDetails["claims"][number]["evidenceRefs"][number];

function evidenceLine(row: EvidenceRow, index: number) {
  const sourceName =
    row.sourceAsset.displayLabel ??
    row.sourceAsset.originalFileName ??
    "Source";

  return {
    sourceId: row.sourceAssetId,
    ref: `S${index + 1}`,
    quote: row.excerpt,
    sourceName,
  };
}

export function snapshotToDocLines(
  snapshot: SnapshotWithDetails | null,
  sessionTitle: string | null,
): DocLineData[] {
  const lines: DocLineData[] = [];
  let lineNum = 1;

  if (sessionTitle) {
    lines.push({ lineNum: lineNum++, type: "h1", text: sessionTitle });
    lines.push({ lineNum: lineNum++, type: "blank" });
  }

  if (!snapshot) return lines;

  const snapshotDetails = snapshot;

  lines.push({
    lineNum: lineNum++,
    type: "meta",
    text: `v${snapshotDetails.version} - ${snapshotDetails.status.toLowerCase()}`,
    small: true,
  });
  lines.push({ lineNum: lineNum++, type: "blank" });

  function pushClaims(section: "SUMMARY" | "GOALS") {
    const claims = snapshotDetails.claims.filter(
      (claim) => claim.section === section,
    );
    if (claims.length === 0) return;

    lines.push({ lineNum: lineNum++, type: "h2", text: SECTION_LABELS[section] });
    for (const claim of claims) {
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: claim.text,
        reqId: claim.id,
        tags: [claim.confidence.toLowerCase()],
        evidence: claim.evidenceRefs.map(evidenceLine),
      });
    }
    lines.push({ lineNum: lineNum++, type: "blank" });
  }

  function pushQuestions(
    section: "AMBIGUITIES" | "FOLLOW_UP_QUESTIONS",
  ) {
    const questions = snapshotDetails.questions.filter(
      (question) => question.section === section,
    );
    if (questions.length === 0) return;

    lines.push({ lineNum: lineNum++, type: "h2", text: SECTION_LABELS[section] });
    for (const question of questions) {
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: question.text,
        reqId: question.id,
        tags: [question.status.toLowerCase()],
        evidence: question.evidenceRefs.map(evidenceLine),
      });
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: question.reason,
        small: true,
      });
    }
    lines.push({ lineNum: lineNum++, type: "blank" });
  }

  pushClaims("SUMMARY");
  pushClaims("GOALS");
  pushQuestions("AMBIGUITIES");
  pushQuestions("FOLLOW_UP_QUESTIONS");

  return lines;
}
