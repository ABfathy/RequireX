type SnapshotTargetInput = {
  snapshotId: string;
  claimId?: string | null;
  claimSnapshotId?: string | null;
  questionId?: string | null;
  questionSnapshotId?: string | null;
};

export function assertExclusiveEvidenceTarget(input: {
  claimId?: string | null;
  questionId?: string | null;
}) {
  const targetCount =
    Number(Boolean(input.claimId)) + Number(Boolean(input.questionId));

  if (targetCount !== 1) {
    throw new Error(
      "EvidenceRef must target exactly one snapshot item: either claimId or questionId.",
    );
  }
}

export function assertCommentSnapshotConsistency(input: SnapshotTargetInput) {
  if (input.claimId && input.claimSnapshotId !== input.snapshotId) {
    throw new Error("BriefComment claim target must belong to the same snapshot.");
  }

  if (input.questionId && input.questionSnapshotId !== input.snapshotId) {
    throw new Error(
      "BriefComment question target must belong to the same snapshot.",
    );
  }
}

export function assertFollowUpAnswerConsistency(input: {
  snapshotId: string;
  questionSnapshotId: string;
  questionSection: string;
}) {
  if (input.questionSnapshotId !== input.snapshotId) {
    throw new Error("FollowUpAnswer question must belong to the same snapshot.");
  }

  if (input.questionSection !== "FOLLOW_UP_QUESTIONS") {
    throw new Error(
      "FollowUpAnswer can only target questions in the FOLLOW_UP_QUESTIONS section.",
    );
  }
}
