"use client";

import { useCallback, useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

type ReviewStatus = "PENDING" | "ACCEPTED" | "DECLINED";

interface AnswerItem {
  id: string;
  body: string;
  authorName: string | null;
  authorEmail: string | null;
  reviewStatus: ReviewStatus;
  createdAt: string;
  question: { text: string; section: string };
}

interface CommentItem {
  id: string;
  body: string;
  authorName: string | null;
  authorEmail: string | null;
  section: string;
  anchorType: string;
  reviewStatus: ReviewStatus;
  createdAt: string;
}

export interface FeedbackTabProps {
  sessionId: string;
  snapshotId: string;
  onRequestRegenerate?: (snapshotId: string) => void;
  alreadyRegenerated?: boolean;
  onFeedbackReviewed?: () => void;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

const STATUS_COLOR: Record<ReviewStatus, string> = {
  PENDING: "var(--warning)",
  ACCEPTED: "var(--success)",
  DECLINED: "var(--danger)",
};

const STATUS_BG: Record<ReviewStatus, string> = {
  PENDING: "var(--warning-subtle)",
  ACCEPTED: "var(--success-subtle)",
  DECLINED: "var(--danger-subtle)",
};

function StatusPill({ status }: { status: ReviewStatus }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide"
      style={{
        color: STATUS_COLOR[status],
        background: STATUS_BG[status],
        border: `1px solid ${STATUS_COLOR[status]}33`,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ReviewButtons({
  status,
  onAccept,
  onDecline,
  disabled,
}: {
  status: ReviewStatus;
  onAccept: () => void;
  onDecline: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={onAccept}
        disabled={disabled || status === "ACCEPTED"}
        className="flex items-center justify-center w-6 h-6 rounded transition-colors disabled:opacity-40"
        style={{
          background: status === "ACCEPTED" ? "var(--success-subtle)" : "transparent",
          border: `1px solid ${status === "ACCEPTED" ? "var(--success)" : "var(--border)"}`,
          color: status === "ACCEPTED" ? "var(--success)" : "var(--fg-tertiary)",
        }}
        title="Accept"
        aria-label="Accept"
      >
        <Icons.Check size={11} />
      </button>
      <button
        onClick={onDecline}
        disabled={disabled || status === "DECLINED"}
        className="flex items-center justify-center w-6 h-6 rounded transition-colors disabled:opacity-40"
        style={{
          background: status === "DECLINED" ? "var(--danger-subtle)" : "transparent",
          border: `1px solid ${status === "DECLINED" ? "var(--danger)" : "var(--border)"}`,
          color: status === "DECLINED" ? "var(--danger)" : "var(--fg-tertiary)",
        }}
        title="Decline"
        aria-label="Decline"
      >
        <Icons.X size={11} />
      </button>
    </div>
  );
}

export function FeedbackTab({
  sessionId,
  snapshotId,
  onRequestRegenerate,
  alreadyRegenerated = false,
  onFeedbackReviewed,
}: FeedbackTabProps) {
  const [answers, setAnswers] = useState<AnswerItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${sessionId}/feedback?snapshotId=${snapshotId}`,
      );
      if (!res.ok) throw new Error("Failed to load feedback");
      const data = await res.json() as { answers: AnswerItem[]; comments: CommentItem[] };
      setAnswers(data.answers);
      setComments(data.comments);
    } catch {
      setError("Failed to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, snapshotId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchFeedback();
  }, [fetchFeedback]);

  const patchItems = useCallback(
    async (items: Array<{ type: "comment" | "answer"; id: string; status: ReviewStatus }>) => {
      setUpdating(true);
      try {
        const res = await fetch(`/api/sessions/${sessionId}/feedback-review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) throw new Error("Update failed");
        onFeedbackReviewed?.();
      } catch {
        void fetchFeedback();
      } finally {
        setUpdating(false);
      }
    },
    [sessionId, fetchFeedback, onFeedbackReviewed],
  );

  const updateAnswerStatus = useCallback(
    (id: string, status: ReviewStatus) => {
      setAnswers((prev) =>
        prev.map((a) => (a.id === id ? { ...a, reviewStatus: status } : a)),
      );
      void patchItems([{ type: "answer", id, status }]);
    },
    [patchItems],
  );

  const updateCommentStatus = useCallback(
    (id: string, status: ReviewStatus) => {
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, reviewStatus: status } : c)),
      );
      void patchItems([{ type: "comment", id, status }]);
    },
    [patchItems],
  );

  const acceptAll = useCallback(() => {
    const items: Array<{ type: "comment" | "answer"; id: string; status: ReviewStatus }> = [
      ...answers.map((a) => ({ type: "answer" as const, id: a.id, status: "ACCEPTED" as ReviewStatus })),
      ...comments.map((c) => ({ type: "comment" as const, id: c.id, status: "ACCEPTED" as ReviewStatus })),
    ];
    setAnswers((prev) => prev.map((a) => ({ ...a, reviewStatus: "ACCEPTED" })));
    setComments((prev) => prev.map((c) => ({ ...c, reviewStatus: "ACCEPTED" })));
    if (items.length > 0) void patchItems(items);
  }, [answers, comments, patchItems]);

  const declineAll = useCallback(() => {
    const items: Array<{ type: "comment" | "answer"; id: string; status: ReviewStatus }> = [
      ...answers.map((a) => ({ type: "answer" as const, id: a.id, status: "DECLINED" as ReviewStatus })),
      ...comments.map((c) => ({ type: "comment" as const, id: c.id, status: "DECLINED" as ReviewStatus })),
    ];
    setAnswers((prev) => prev.map((a) => ({ ...a, reviewStatus: "DECLINED" })));
    setComments((prev) => prev.map((c) => ({ ...c, reviewStatus: "DECLINED" })));
    if (items.length > 0) void patchItems(items);
  }, [answers, comments, patchItems]);

  const hasAccepted =
    answers.some((a) => a.reviewStatus === "ACCEPTED") ||
    comments.some((c) => c.reviewStatus === "ACCEPTED");

  const totalCount = answers.length + comments.length;

  const allReviewed =
    totalCount > 0 &&
    answers.every((a) => a.reviewStatus !== "PENDING") &&
    comments.every((c) => c.reviewStatus !== "PENDING");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          Loading feedback…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <div className="text-[12px]" style={{ color: "var(--danger)" }}>
          {error}
        </div>
        <button
          onClick={() => void fetchFeedback()}
          className="text-[11px] underline"
          style={{ color: "var(--fg-muted)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          No feedback submitted yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b" style={{ borderColor: "var(--border)" }}>
        {/* Row 1: title + refresh */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--fg-2)" }}>
              Feedback Review
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: "var(--surface-2)", color: "var(--fg-muted)" }}
            >
              {totalCount}
            </span>
            {allReviewed && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{ background: "var(--success-subtle)", color: "var(--success)" }}
              >
                Reviewed
              </span>
            )}
          </div>
          <button
            onClick={() => void fetchFeedback()}
            disabled={loading}
            title="Reload feedback (pick up new client submissions)"
            className="flex items-center justify-center size-6 rounded transition-colors hover:bg-[var(--surface-3)] disabled:opacity-40 cursor-pointer focus-visible:outline-none"
            style={{ color: "var(--fg-tertiary)" }}
          >
            <Icons.Refresh size={13} />
          </button>
        </div>

        {/* Row 2: batch controls + save */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5">
          <button
            onClick={acceptAll}
            disabled={updating || allReviewed}
            className="text-[10px] font-medium px-2 py-1 rounded transition-colors disabled:opacity-40 hover:opacity-80 active:scale-[0.97]"
            style={{
              background: "var(--success-subtle)",
              color: "var(--success)",
              border: "1px solid var(--success)33",
            }}
          >
            Accept all
          </button>
          <button
            onClick={declineAll}
            disabled={updating || allReviewed}
            className="text-[10px] font-medium px-2 py-1 rounded transition-colors disabled:opacity-40 hover:opacity-80 active:scale-[0.97]"
            style={{
              background: "var(--danger-subtle)",
              color: "var(--danger)",
              border: "1px solid var(--danger)33",
            }}
          >
            Decline all
          </button>
          <div className="flex-1" />
          <Button
            variant="default"
            size="sm"
            onClick={() => onRequestRegenerate?.(snapshotId)}
            disabled={!hasAccepted || alreadyRegenerated}
          >
            {alreadyRegenerated ? "Regenerated ✓" : "Save & Regenerate"}
          </Button>
        </div>

        {/* Hint strip */}
        {!hasAccepted && (
          <div className="px-4 pb-2">
            <p className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
              Accept at least one item to regenerate
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Answers section */}
        {answers.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] sticky top-0"
              style={{
                color: "var(--fg-muted)",
                background: "var(--surface-1)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Answers ({answers.length})
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {answers.map((answer) => (
                <div key={answer.id} className="px-4 py-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] mb-1 truncate"
                      style={{ color: "var(--fg-muted)" }}
                      title={answer.question.text}
                    >
                      Q: {answer.question.text}
                    </div>
                    <div className="text-[12px] leading-snug mb-1.5" style={{ color: "var(--fg-1)" }}>
                      {answer.body}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={answer.reviewStatus} />
                      {(answer.authorName ?? answer.authorEmail) && (
                        <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                          {answer.authorName ?? answer.authorEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <ReviewButtons
                    status={answer.reviewStatus}
                    onAccept={() => updateAnswerStatus(answer.id, "ACCEPTED")}
                    onDecline={() => updateAnswerStatus(answer.id, "DECLINED")}
                    disabled={updating || allReviewed}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments section */}
        {comments.length > 0 && (
          <div>
            <div
              className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] sticky top-0"
              style={{
                color: "var(--fg-muted)",
                background: "var(--surface-1)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              Comments ({comments.length})
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {comments.map((comment) => (
                <div key={comment.id} className="px-4 py-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[10px] mb-1"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {comment.section.toLowerCase().replace(/_/g, " ")}
                    </div>
                    <div className="text-[12px] leading-snug mb-1.5" style={{ color: "var(--fg-1)" }}>
                      {comment.body}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={comment.reviewStatus} />
                      {(comment.authorName ?? comment.authorEmail) && (
                        <span className="text-[10px]" style={{ color: "var(--fg-muted)" }}>
                          {comment.authorName ?? comment.authorEmail}
                        </span>
                      )}
                    </div>
                  </div>
                  <ReviewButtons
                    status={comment.reviewStatus}
                    onAccept={() => updateCommentStatus(comment.id, "ACCEPTED")}
                    onDecline={() => updateCommentStatus(comment.id, "DECLINED")}
                    disabled={updating || allReviewed}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
