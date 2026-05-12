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

function buildSourceIndexMap(snapshot: SnapshotWithDetails): Map<string, number> {
  const map = new Map<string, number>();
  let counter = 0;
  const allEvidence = [
    ...snapshot.claims.flatMap((c) => c.evidenceRefs),
    ...snapshot.questions.flatMap((q) => q.evidenceRefs),
  ];
  for (const ev of allEvidence) {
    if (!map.has(ev.sourceAssetId)) {
      map.set(ev.sourceAssetId, ++counter);
    }
  }
  return map;
}

function evidenceLine(row: EvidenceRow, sourceIndex: number) {
  const sourceName =
    row.sourceAsset.displayLabel ??
    row.sourceAsset.originalFileName ??
    "Source";

  return {
    sourceId: row.sourceAssetId,
    ref: `S${sourceIndex}`,
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

  const sourceIndexMap = buildSourceIndexMap(snapshot);

  lines.push({
    lineNum: lineNum++,
    type: "meta",
    text: `v${snapshot.version} - ${snapshot.status.toLowerCase()}`,
    small: true,
  });
  lines.push({ lineNum: lineNum++, type: "blank" });

  function pushClaims(section: "SUMMARY" | "GOALS") {
    const claims = snapshot!.claims.filter((claim) => claim.section === section);
    if (claims.length === 0) return;

    lines.push({ lineNum: lineNum++, type: "h2", text: SECTION_LABELS[section] });
    for (const claim of claims) {
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: claim.text,
        reqId: claim.id,
        reqType: "claim",
        tags: [claim.confidence.toLowerCase()],
        evidence: claim.evidenceRefs.map((ev) =>
          evidenceLine(ev, sourceIndexMap.get(ev.sourceAssetId) ?? 0),
        ),
      });
    }
    lines.push({ lineNum: lineNum++, type: "blank" });
  }

  function pushQuestions(section: "AMBIGUITIES" | "FOLLOW_UP_QUESTIONS") {
    const questions = snapshot!.questions.filter(
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
        reqType: "question",
        tags: [question.status.toLowerCase()],
        evidence: question.evidenceRefs.map((ev) =>
          evidenceLine(ev, sourceIndexMap.get(ev.sourceAssetId) ?? 0),
        ),
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
