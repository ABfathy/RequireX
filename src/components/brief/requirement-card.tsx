"use client";

import { MessageSquare } from "lucide-react";
import { useState } from "react";

import { CommentThread } from "@/components/brief/comment-thread";
import { QuestionBlock } from "@/components/brief/question-block";
import { Pill, type PillTone } from "@/components/ui/pill";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

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
  id: string;
  section: string;
  title: string;
  body: string;
  status: string;
  tags: string[];
  question?: string;
}

interface RequirementCardProps {
  req: Requirement;
}

function RequirementCard({ req }: RequirementCardProps) {
  const [commentOpen, setCommentOpen] = useState(false);
  const [hasComment, setHasComment] = useState(false);
  const hasQuestion = !!req.question;
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

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

      {/* Question block */}
      {hasQuestion && !answerSubmitted && (
        <QuestionBlock
          question={req.question!}
          onSubmitAnswer={() => setAnswerSubmitted(true)}
        />
      )}
      {hasQuestion && answerSubmitted && (
        <QuestionBlock question={req.question!} />
      )}

      {/* Comment thread */}
      <CommentThread
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmitComment={() => setHasComment(true)}
      />
    </div>
  );
}

export { RequirementCard };
