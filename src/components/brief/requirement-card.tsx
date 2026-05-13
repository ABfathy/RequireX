"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { CommentThread } from "@/components/brief/comment-thread";
import { QuestionBlock } from "@/components/brief/question-block";
import { Pill, type PillTone } from "@/components/ui/pill";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import type { BriefCommentSection } from "../../../generated/prisma/client";

import type { BriefCommentSection } from "../../../generated/prisma/client";

const STATUS_TONE: Record<string, PillTone> = {
  approved: "success",
  "in-review": "info",
  draft: "neutral",
  conflict: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  "in-review": "In review",
  draft: "Draft",
  conflict: "Conflict",
};

export interface Requirement {
  /** Display identifier, e.g. "REQ-0140" */
  id: string;
  /** Display section label, e.g. "Functional requirements" */
  section: string;
  /**
   * API enum section — maps to the backend BriefCommentSection.
   * Must be one of: SUMMARY | GOALS | AMBIGUITIES | FOLLOW_UP_QUESTIONS
   */
  commentSection: BriefCommentSection;
  title: string;
  body: string;
  status: string;
  tags: string[];
  question?: string;
  /** Real UUID when this card maps to a BriefClaim row; omit for mock/section-only comments */
  claimId?: string;
  /** Real UUID when this card maps to a BriefQuestion row; omit for mock/section-only comments */
  questionId?: string;
}

interface RequirementCardProps {
  req: Requirement;
  /** Page-level comment submit handler */
  onSubmitComment?: (
    target: {
      section: BriefCommentSection;
      claimId?: string;
      questionId?: string;
    },
    body: string,
  ) => Promise<void>;
  /** Page-level answer submit handler — receives the question UUID and answer body */
  onSubmitAnswer?: (questionId: string, body: string) => Promise<void>;
}

function RequirementCard({ req, onSubmitComment, onSubmitAnswer }: RequirementCardProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [hasComment, setHasComment] = useState(false);
  const hasQuestion = !!req.question;

  /** Binds this card's target metadata so CommentThread only sees (body: string) => Promise<void> */
  const handleCommentSubmit = onSubmitComment
    ? async (body: string) => {
        await onSubmitComment(
          {
            section: req.commentSection,
            claimId: req.claimId,
            questionId: req.questionId,
          },
          body,
        );
        setHasComment(true);
      }
    : undefined;

  /**
   * Binds this card's questionId so QuestionBlock only sees (body: string) => Promise<void>.
   * Only created when both the handler and a real UUID are available.
   */
  const handleAnswerSubmit =
    onSubmitAnswer && req.questionId
      ? async (body: string) => {
          await onSubmitAnswer(req.questionId!, body);
        }
      : undefined;

  return (
    <div
      className={cn(
        "group border rounded-lg p-4 px-[18px] mb-2 relative cursor-default",
        "transition-colors duration-fast ease-out-app",
        hasComment
          ? "border-accent bg-accent-subtle"
          : "border-border hover:border-border-strong",
      )}
    >
      {/* Header row — stacks vertically on mobile, single row on sm+ */}
      <div className="flex flex-col gap-1.5 mb-2 sm:flex-row sm:items-center sm:gap-2">
        {/* Left: ID + status — never overflow, always first */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-fg-4 shrink-0">{req.id}</span>
          <Pill tone={STATUS_TONE[req.status] ?? "neutral"}>
            {STATUS_LABEL[req.status] ?? req.status}
          </Pill>
        </div>

        {/* Desktop spacer */}
        <span className="hidden sm:flex flex-1" />

        {/* Right: tags + comment button — wraps as a unit */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {req.tags.map((t) => (
            <Tag key={t}>{t}</Tag>
          ))}
          <button
            type="button"
            aria-label={commentOpen ? "Close comment" : "Add comment"}
            aria-expanded={commentOpen}
            className={cn(
              "flex items-center gap-[5px] py-[3px] px-2 rounded-sm",
              "bg-transparent border border-border text-[11px] text-fg-4 cursor-pointer",
              "sm:opacity-0 sm:group-hover:opacity-100",
              "transition-all duration-fast ease-out-app",
              "hover:border-border-focus hover:text-fg-1",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
            )}
            onClick={() => setCommentOpen((o) => !o)}
          >
            <MessageSquare size={11} aria-hidden="true" />
            <span>{commentOpen ? "Close" : "Comment"}</span>
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="text-md font-semibold text-fg-1 tracking-[-0.01em] mb-1.5">
        {req.title}
      </div>

      {/* Body */}
      <div className="text-[14px] text-fg-2 leading-[1.65]">{req.body}</div>

      {/* Question block — manages its own answered/submitted state internally */}
      {hasQuestion && (
        <QuestionBlock
          question={req.question!}
          onSubmitAnswer={handleAnswerSubmit}
        />
      )}

      {/* Comment thread */}
      <CommentThread
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmitComment={handleCommentSubmit}
      />
    </div>
  );
}

export { RequirementCard };
