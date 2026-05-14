import { prisma } from "@/lib/prisma";
import {
  assertCommentSnapshotConsistency,
  assertFollowUpAnswerConsistency,
  type PublicBriefConfirmInput,
  type PublicCommentInput,
  type PublicFollowUpAnswerInput,
} from "@/server/validators";

import {
  ActorType,
  type BriefClaimSection,
  type BriefConfidence,
  type BriefDocumentType,
  type BriefQuestionSection,
  BriefQuestionStatus,
  BriefSnapshotStatus,
  type RevisionEventType,
  ShareLinkStatus,
} from "../../../generated/prisma/client";

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
            documentType: true;
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
        documentType: BriefDocumentType;
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
  documentType: BriefDocumentType;
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
  const authorEmail =
    normalizeOptionalString(input.authorEmail)?.toLowerCase() ?? null;
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
          documentType: true,
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
    documentType: shareLink.snapshot.documentType,
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
      throw new PublicReviewValidationError(
        "claimId is invalid for this request.",
      );
    }

    if (input.questionId && !question) {
      throw new PublicReviewValidationError(
        "questionId is invalid for this request.",
      );
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
        error instanceof Error
          ? error.message
          : "Invalid public comment target.",
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
        error instanceof Error
          ? error.message
          : "Invalid follow-up answer target.",
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

export type PublicBriefViewData = {
  shareToken: string;
  snapshot: {
    id: string;
    version: number;
    documentType: BriefDocumentType;
    status: BriefSnapshotStatus;
    createdAt: Date;
  };
  project: {
    id: string;
    name: string;
    clientName: string;
  };
  claims: Array<{
    id: string;
    section: BriefClaimSection;
    orderIndex: number;
    text: string;
    confidence: BriefConfidence;
  }>;
  questions: Array<{
    id: string;
    section: BriefQuestionSection;
    orderIndex: number;
    text: string;
    reason: string;
    status: BriefQuestionStatus;
    answerText: string | null;
  }>;
  comments: Array<{
    id: string;
    section: string;
    anchorType: string;
    body: string;
    authorName: string | null;
    authorEmail: string | null;
    claimId: string | null;
    questionId: string | null;
    createdAt: Date;
  }>;
  revisions: Array<{
    id: string;
    type: RevisionEventType;
    summary: string;
    createdAt: Date;
    snapshotVersion: number | null;
    snapshotDocumentType: BriefDocumentType | null;
  }>;
};

export async function loadPublicBriefView(
  shareToken: string,
): Promise<PublicBriefViewData> {
  const access = await getPublicReviewAccessContext(prisma, shareToken);

  const [snapshot, revisions, comments] = await Promise.all([
    prisma.briefSnapshot.findUnique({
      where: { id: access.snapshotId },
      select: {
        id: true,
        version: true,
        documentType: true,
        status: true,
        createdAt: true,
        project: {
          select: { id: true, name: true, clientName: true },
        },
        claims: {
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
          select: {
            id: true,
            section: true,
            orderIndex: true,
            text: true,
            confidence: true,
          },
        },
        questions: {
          orderBy: [{ section: "asc" }, { orderIndex: "asc" }],
          select: {
            id: true,
            section: true,
            orderIndex: true,
            text: true,
            reason: true,
            status: true,
            answers: {
              select: { body: true },
              orderBy: { createdAt: "asc" as const },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.revisionEvent.findMany({
      where: { sessionId: access.sessionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        summary: true,
        createdAt: true,
        snapshot: { select: { version: true, documentType: true } },
      },
    }),
    prisma.briefComment.findMany({
      where: { snapshotId: access.snapshotId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        section: true,
        anchorType: true,
        body: true,
        authorName: true,
        authorEmail: true,
        claimId: true,
        questionId: true,
        createdAt: true,
      },
    }),
  ]);

  if (!snapshot) throw new PublicShareLinkNotFoundError();

  return {
    shareToken,
    snapshot: {
      id: snapshot.id,
      version: snapshot.version,
      documentType: snapshot.documentType,
      status: snapshot.status,
      createdAt: snapshot.createdAt,
    },
    project: snapshot.project,
    claims: snapshot.claims,
    questions: snapshot.questions.map((q) => ({
      ...q,
      answerText: q.answers[0]?.body ?? null,
    })),
    comments,
    revisions: revisions.map((rev) => ({
      id: rev.id,
      type: rev.type,
      summary: rev.summary,
      createdAt: rev.createdAt,
      snapshotVersion: rev.snapshot?.version ?? null,
      snapshotDocumentType: rev.snapshot?.documentType ?? null,
    })),
  };
}

export async function confirmPublicBrief(
  shareToken: string,
  input: PublicBriefConfirmInput,
) {
  return prisma.$transaction(async (tx) => {
    const access = await getPublicReviewAccessContext(tx, shareToken);

    if (access.snapshotStatus === BriefSnapshotStatus.CONFIRMED) {
      return {
        id: access.snapshotId,
        status: BriefSnapshotStatus.CONFIRMED,
        sessionId: access.sessionId,
      };
    }

    if (access.documentType !== "GENERATED_BRIEF") {
      throw new PublicReviewReadOnlyError(access.snapshotStatus);
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

    return { ...snapshot, sessionId: access.sessionId };
  });
}
