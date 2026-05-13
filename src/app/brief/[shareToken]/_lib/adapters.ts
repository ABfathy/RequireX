import type { Requirement } from "@/components/brief/requirement-card";
import type { Revision } from "@/components/brief/revision-panel";

import type {
  BriefClaimSection,
  BriefCommentSection,
  BriefConfidence,
  BriefQuestionSection,
  BriefQuestionStatus,
  RevisionEventType,
} from "../../../../../generated/prisma/client";

const CLAIM_SECTION_LABEL: Record<BriefClaimSection, string> = {
  SUMMARY: "Summary",
  GOALS: "Goals",
};

const CLAIM_SECTION_TO_COMMENT: Record<BriefClaimSection, BriefCommentSection> =
  {
    SUMMARY: "SUMMARY",
    GOALS: "GOALS",
  };

const QUESTION_SECTION_LABEL: Record<BriefQuestionSection, string> = {
  AMBIGUITIES: "Ambiguities",
  FOLLOW_UP_QUESTIONS: "Follow-up questions",
};

const QUESTION_SECTION_TO_COMMENT: Record<
  BriefQuestionSection,
  BriefCommentSection
> = {
  AMBIGUITIES: "AMBIGUITIES",
  FOLLOW_UP_QUESTIONS: "FOLLOW_UP_QUESTIONS",
};

const CONFIDENCE_TO_STATUS: Record<BriefConfidence, string> = {
  HIGH: "approved",
  MEDIUM: "in-review",
  LOW: "draft",
};

const QUESTION_STATUS_TO_STATUS: Record<BriefQuestionStatus, string> = {
  OPEN: "in-review",
  ANSWERED: "approved",
  RESOLVED: "approved",
};

export function claimToRequirement(claim: {
  id: string;
  section: BriefClaimSection;
  orderIndex: number;
  text: string;
  confidence: BriefConfidence;
}): Requirement {
  return {
    id: `REQ-${String(claim.orderIndex).padStart(4, "0")}`,
    section: CLAIM_SECTION_LABEL[claim.section],
    commentSection: CLAIM_SECTION_TO_COMMENT[claim.section],
    title: "",
    body: claim.text,
    status: CONFIDENCE_TO_STATUS[claim.confidence],
    tags: [],
    claimId: claim.id,
  };
}

export function questionToRequirement(question: {
  id: string;
  section: BriefQuestionSection;
  orderIndex: number;
  text: string;
  reason: string;
  status: BriefQuestionStatus;
}): Requirement {
  return {
    id: `Q-${String(question.orderIndex).padStart(4, "0")}`,
    section: QUESTION_SECTION_LABEL[question.section],
    commentSection: QUESTION_SECTION_TO_COMMENT[question.section],
    title: "",
    body: question.reason,
    question: question.text,
    status: QUESTION_STATUS_TO_STATUS[question.status],
    tags: [],
    questionId: question.id,
  };
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export function revisionToRevision(
  rev: {
    id: string;
    type: RevisionEventType;
    summary: string;
    createdAt: Date;
    snapshotVersion: number | null;
  },
  currentSnapshotVersion: number,
): Revision {
  return {
    id: rev.id,
    label: rev.snapshotVersion != null ? `v${rev.snapshotVersion}` : "—",
    time: formatRelativeTime(rev.createdAt),
    msg: rev.summary,
    current: rev.snapshotVersion === currentSnapshotVersion,
  };
}
