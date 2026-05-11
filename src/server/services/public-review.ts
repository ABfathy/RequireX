import {
  ActorType,
  BriefQuestionStatus,
  BriefSnapshotStatus,
  ShareLinkStatus,
} from "../../../generated/prisma/client";

import { prisma } from "@/lib/prisma";
import {
  assertCommentSnapshotConsistency,
  assertFollowUpAnswerConsistency,
  type PublicBriefConfirmInput,
  type PublicCommentInput,
  type PublicFollowUpAnswerInput,
} from "@/server/validators";

type PublicReviewDb = {
  shareLink: {
    findUnique(args: {
      where: { token: string };
      select: {
        id: true;
        status: true;
        expiresAt: true;
        snapshotId: true;
        snapshot: {
          select: {
            id: true;
            status: true;
            projectId: true;
            sessionId: true;
          };
        };
      };
    }): Promise<{
      id: string;
      status: ShareLinkStatus;
      expiresAt: Date | null;
      snapshotId: string;
      snapshot: {
        id: string;
        status: BriefSnapshotStatus;
        projectId: string;
        sessionId: string;
      };
    } | null>;
    update(args: {
      where: { id: string };
      data: { status: ShareLinkStatus };
    }): Promise<unknown>;
  };
};

type PublicReviewAccessContext = {
  projectId: string;
  sessionId: string;
  shareLinkId: string;
  snapshotId: string;
  snapshotStatus: BriefSnapshotStatus;
};

type ClientAttribution = {
  actorId: string;
  authorEmail: string | null;
  authorName: string | null;
};

export class PublicShareLinkNotFoundError extends Error {
  constructor() {
    super("Public brief link not found.");
    this.name = "PublicShareLinkNotFoundError";
  }
}

export class PublicReviewReadOnlyError extends Error {
  constructor(status: BriefSnapshotStatus) {
    super(`Snapshot is read-only for public review: ${status}`);
    this.name = "PublicReviewReadOnlyError";
  }
}

export class PublicReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicReviewValidationError";
  }
}

function normalizeOptionalString(value: string | null | undefined) {
  return value?.trim() || null;
}

function toClientAttribution(
  shareLinkId: string,
  input: {
    authorName?: string;
    authorEmail?: string;
  },
): ClientAttribution {
  const authorEmail = normalizeOptionalString(input.authorEmail)?.toLowerCase() ?? null;
  const authorName = normalizeOptionalString(input.authorName);

  return {
    actorId: authorEmail ?? `share-link:${shareLinkId}`,
    authorEmail,
    authorName,
  };
}

async function getPublicReviewAccessContext(
  db: PublicReviewDb,
  shareToken: string,
): Promise<PublicReviewAccessContext> {
  const shareLink = await db.shareLink.findUnique({
    where: { token: shareToken },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      snapshotId: true,
      snapshot: {
        select: {
          id: true,
          status: true,
          projectId: true,
          sessionId: true,
        },
      },
    },
  });

  if (!shareLink || shareLink.status !== ShareLinkStatus.ACTIVE) {
    throw new PublicShareLinkNotFoundError();
  }

  if (shareLink.expiresAt && shareLink.expiresAt <= new Date()) {
    if (shareLink.status === ShareLinkStatus.ACTIVE) {
      await db.shareLink.update({
        where: { id: shareLink.id },
        data: { status: ShareLinkStatus.EXPIRED },
      });
    }

    throw new PublicShareLinkNotFoundError();
  }

  return {
    projectId: shareLink.snapshot.projectId,
    sessionId: shareLink.snapshot.sessionId,
    shareLinkId: shareLink.id,
    snapshotId: shareLink.snapshot.id,
    snapshotStatus: shareLink.snapshot.status,
  };
}

function assertWritablePublicSnapshot(status: BriefSnapshotStatus) {
  if (status !== BriefSnapshotStatus.SHARED) {
    throw new PublicReviewReadOnlyError(status);
  }
}

export async function createPublicComment(
  shareToken: string,
  input: PublicCommentInput,
) {
  return prisma.$transaction(async (tx) => {
    const access = await getPublicReviewAccessContext(tx, shareToken);
    assertWritablePublicSnapshot(access.snapshotStatus);

    const claim = input.claimId
      ? await tx.briefClaim.findUnique({
          where: { id: input.claimId },
          select: { id: true, snapshotId: true, section: true },
        })
      : null;
    const question = input.questionId
      ? await tx.briefQuestion.findUnique({
          where: { id: input.questionId },
          select: { id: true, snapshotId: true, section: true },
        })
      : null;

    if (input.claimId && !claim) {
      throw new PublicReviewValidationError("claimId is invalid for this request.");
    }

    if (input.questionId && !question) {
      throw new PublicReviewValidationError("questionId is invalid for this request.");
    }

    try {
      assertCommentSnapshotConsistency({
        snapshotId: access.snapshotId,
        claimId: claim?.id,
        claimSnapshotId: claim?.snapshotId,
        questionId: question?.id,
        questionSnapshotId: question?.snapshotId,
      });
    } catch (error) {
      throw new PublicReviewValidationError(
        error instanceof Error ? error.message : "Invalid public comment target.",
      );
    }

    if (claim && claim.section !== input.section) {
      throw new PublicReviewValidationError(
        "Comment section must match the targeted claim section.",
      );
    }

    if (question && question.section !== input.section) {
      throw new PublicReviewValidationError(
        "Comment section must match the targeted question section.",
      );
    }

    const attribution = toClientAttribution(access.shareLinkId, input);

    const comment = await tx.briefComment.create({
      data: {
        snapshotId: access.snapshotId,
        section: input.section,
        anchorType: input.anchorType,
        claimId: claim?.id ?? null,
        questionId: question?.id ?? null,
        selectionText: input.selectionText ?? null,
        authorName: attribution.authorName,
        authorEmail: attribution.authorEmail,
        body: input.body,
      },
    });

    await tx.revisionEvent.create({
      data: {
        projectId: access.projectId,
        sessionId: access.sessionId,
        snapshotId: access.snapshotId,
        type: "CLIENT_COMMENT_ADDED",
        actorType: ActorType.CLIENT,
        actorId: attribution.actorId,
        summary: "Client added public review feedback.",
        metadata: {
          shareLinkId: access.shareLinkId,
          commentId: comment.id,
          section: input.section,
          anchorType: input.anchorType,
        },
      },
    });

    return comment;
  });
}

export async function createPublicFollowUpAnswer(
  shareToken: string,
  input: PublicFollowUpAnswerInput,
) {
  return prisma.$transaction(async (tx) => {
    const access = await getPublicReviewAccessContext(tx, shareToken);
    assertWritablePublicSnapshot(access.snapshotStatus);

    const question = await tx.briefQuestion.findUnique({
      where: { id: input.questionId },
      select: {
        id: true,
        snapshotId: true,
        section: true,
        status: true,
      },
    });

    if (!question) {
      throw new PublicReviewValidationError(
        "questionId is invalid for this request.",
      );
    }

    try {
      assertFollowUpAnswerConsistency({
        snapshotId: access.snapshotId,
        questionSnapshotId: question.snapshotId,
        questionSection: question.section,
      });
    } catch (error) {
      throw new PublicReviewValidationError(
        error instanceof Error ? error.message : "Invalid follow-up answer target.",
      );
    }

    const attribution = toClientAttribution(access.shareLinkId, input);

    const answer = await tx.followUpAnswer.create({
      data: {
        snapshotId: access.snapshotId,
        questionId: question.id,
        body: input.body,
        authorName: attribution.authorName,
        authorEmail: attribution.authorEmail,
      },
    });

    if (question.status === BriefQuestionStatus.OPEN) {
      await tx.briefQuestion.update({
        where: { id: question.id },
        data: { status: BriefQuestionStatus.ANSWERED },
      });
    }

    await tx.revisionEvent.create({
      data: {
        projectId: access.projectId,
        sessionId: access.sessionId,
        snapshotId: access.snapshotId,
        type: "CLIENT_ANSWER_ADDED",
        actorType: ActorType.CLIENT,
        actorId: attribution.actorId,
        summary: "Client answered a public follow-up question.",
        metadata: {
          shareLinkId: access.shareLinkId,
          answerId: answer.id,
          questionId: question.id,
        },
      },
    });

    return answer;
  });
}

export async function confirmPublicBrief(
  shareToken: string,
  input: PublicBriefConfirmInput,
) {
  return prisma.$transaction(async (tx) => {
    const access = await getPublicReviewAccessContext(tx, shareToken);

    if (access.snapshotStatus === BriefSnapshotStatus.CONFIRMED) {
      return {
        snapshotId: access.snapshotId,
        status: BriefSnapshotStatus.CONFIRMED,
      };
    }

    assertWritablePublicSnapshot(access.snapshotStatus);

    const attribution = toClientAttribution(access.shareLinkId, input);

    const snapshot = await tx.briefSnapshot.update({
      where: { id: access.snapshotId },
      data: { status: BriefSnapshotStatus.CONFIRMED },
      select: { id: true, status: true },
    });

    await tx.revisionEvent.create({
      data: {
        projectId: access.projectId,
        sessionId: access.sessionId,
        snapshotId: access.snapshotId,
        type: "BRIEF_CONFIRMED",
        actorType: ActorType.CLIENT,
        actorId: attribution.actorId,
        summary: "Client confirmed the public brief.",
        metadata: {
          shareLinkId: access.shareLinkId,
          authorName: attribution.authorName,
          authorEmail: attribution.authorEmail,
        },
      },
    });

    return snapshot;
  });
}
