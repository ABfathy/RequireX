import type { DocLineData } from "@/components/editor/doc-view";
import type { SnapshotWithDetails } from "@/server/services/snapshot";

const SECTION_LABELS = {
  SUMMARY: "Summary",
  GOALS: "Goals",
  PROJECT_OVERVIEW: "Project Overview",
  PROJECT_GOALS: "Project Goals",
  MAIN_FEATURES: "Main Features",
  FUNCTIONAL_REQUIREMENTS: "Functional Requirements",
  NON_FUNCTIONAL_REQUIREMENTS: "Non-Functional Requirements",
  USER_FLOWS: "User Flows",
  AMBIGUITIES: "Ambiguities",
  FOLLOW_UP_QUESTIONS: "Follow-up Questions",
} as const;

const GENERATED_CLAIM_SECTIONS = ["SUMMARY", "GOALS"] as const;
const FINALIZED_CLAIM_SECTIONS = [
  "PROJECT_OVERVIEW",
  "PROJECT_GOALS",
  "MAIN_FEATURES",
  "FUNCTIONAL_REQUIREMENTS",
  "NON_FUNCTIONAL_REQUIREMENTS",
  "USER_FLOWS",
] as const;

type EvidenceRow =
  SnapshotWithDetails["claims"][number]["evidenceRefs"][number];

function buildSourceIndex(snapshot: SnapshotWithDetails): Map<string, number> {
  const map = new Map<string, number>();
  const allRefs = [
    ...snapshot.claims.flatMap((c) => c.evidenceRefs),
    ...snapshot.questions.flatMap((q) => q.evidenceRefs),
  ];
  for (const ref of allRefs) {
    if (!map.has(ref.sourceAssetId)) map.set(ref.sourceAssetId, map.size + 1);
  }
  return map;
}

function evidenceLine(row: EvidenceRow, sourceIndex: Map<string, number>) {
  const num = sourceIndex.get(row.sourceAssetId) ?? 1;
  return {
    sourceId: row.sourceAssetId,
    ref: `S${num}`,
    quote: row.excerpt,
    sourceName:
      row.sourceAsset.displayLabel ??
      row.sourceAsset.originalFileName ??
      "Source",
  };
}

export function snapshotToDocLines(
  snapshot: SnapshotWithDetails | null,
): DocLineData[] {
  const lines: DocLineData[] = [];
  let lineNum = 1;

  if (!snapshot) return lines;

  const sourceIndex = buildSourceIndex(snapshot);

  const versionLabel =
    snapshot.documentType === "FINALIZED_DOCUMENT"
      ? "Finalized Version"
      : "Brief Version";

  lines.push({
    lineNum: lineNum++,
    type: "meta",
    text: `${versionLabel} ${snapshot.version} - ${snapshot.status.toLowerCase()}`,
    small: true,
  });
  lines.push({ lineNum: 0, type: "blank" });

  function pushClaims(
    section:
      | (typeof GENERATED_CLAIM_SECTIONS)[number]
      | (typeof FINALIZED_CLAIM_SECTIONS)[number],
  ) {
    const claims = snapshot!.claims.filter(
      (claim) => claim.section === section,
    );
    if (claims.length === 0) return;

    lines.push({
      lineNum: lineNum++,
      type: "h2",
      text: SECTION_LABELS[section],
    });
    for (const claim of claims) {
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: claim.text,
        reqId: claim.id,
        reqType: "claim",
        section: claim.section,
        orderIndex: claim.orderIndex,
        tags: [claim.confidence.toLowerCase()],
        evidence: claim.evidenceRefs.map((row) =>
          evidenceLine(row, sourceIndex),
        ),
      });
    }
    lines.push({ lineNum: 0, type: "blank" });
  }

  function pushQuestions(section: "AMBIGUITIES" | "FOLLOW_UP_QUESTIONS") {
    const questions = snapshot!.questions.filter(
      (question) => question.section === section,
    );
    if (questions.length === 0) return;

    lines.push({
      lineNum: lineNum++,
      type: "h2",
      text: SECTION_LABELS[section],
    });
    for (const question of questions) {
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: question.text,
        reqId: question.id,
        reqType: "question",
        tags: [question.status.toLowerCase()],
        evidence: question.evidenceRefs.map((row) =>
          evidenceLine(row, sourceIndex),
        ),
      });
      lines.push({
        lineNum: lineNum++,
        type: "body",
        text: question.reason,
        small: true,
      });
    }
    lines.push({ lineNum: 0, type: "blank" });
  }

  const claimSections =
    snapshot.documentType === "FINALIZED_DOCUMENT"
      ? FINALIZED_CLAIM_SECTIONS
      : GENERATED_CLAIM_SECTIONS;

  for (const section of claimSections) {
    pushClaims(section);
  }

  if (snapshot.documentType === "GENERATED_BRIEF") {
    pushQuestions("AMBIGUITIES");
    pushQuestions("FOLLOW_UP_QUESTIONS");
  }

  return lines;
}
