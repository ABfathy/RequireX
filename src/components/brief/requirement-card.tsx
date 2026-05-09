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
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs text-fg-4">{req.id}</span>
        <Pill tone={STATUS_TONE[req.status] ?? "neutral"}>
          {STATUS_LABEL[req.status] ?? req.status}
        </Pill>
        <span className="flex-1" />
        {req.tags.map((t) => (
          <Tag key={t}>{t}</Tag>
        ))}
        <button
          className={cn(
            "flex items-center gap-[5px] py-[3px] px-2 rounded-sm",
            "bg-transparent border border-border text-[11px] text-fg-4 cursor-default",
            "opacity-0 group-hover:opacity-100",
            "transition-all duration-fast ease-out-app",
            "hover:border-border-focus hover:text-fg-1",
          )}
          onClick={() => setCommentOpen((o) => !o)}
        >
          <MessageSquare size={11} />
          <span>{commentOpen ? "Close" : "Comment"}</span>
        </button>
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
