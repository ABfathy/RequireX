"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

interface CommentThreadProps {
  isOpen: boolean;
  onClose: () => void;
  /** Async handler owned by the page. Throw a string message to surface an inline error. */
  onSubmitComment?: (body: string) => Promise<void>;
}

function CommentThread({
  isOpen,
  onClose,
  onSubmitComment,
}: CommentThreadProps) {
  const textareaId = useId();
  const [commentText, setCommentText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const body = commentText.trim();
    if (!body || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitComment?.(body);
      setSubmitted(true);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !submitted) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-border flex flex-col gap-2">
      {submitted ? (
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-surface-3 shrink-0 grid place-items-center text-[10px] text-fg-3 font-medium">
            CL
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-fg-4 font-medium uppercase tracking-[0.06em]">
              Client · just now
            </div>
            <div className="text-[12.5px] text-fg-2 leading-normal">
              {commentText}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 items-start">
          <div className="w-6 h-6 rounded-full bg-surface-3 shrink-0 grid place-items-center text-[10px] text-fg-3 font-medium">
            CL
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <label htmlFor={textareaId} className="sr-only">
              Comment
            </label>
            <textarea
              id={textareaId}
              className="w-full bg-surface-1 border border-border rounded-md p-[7px] px-2.5 font-sans text-[12.5px] text-fg-1 resize-none min-h-9 transition-colors duration-fast ease-out-app focus-visible:outline-none focus-visible:border-border-strong focus-visible:ring-1 focus-visible:ring-accent placeholder:text-fg-4 disabled:opacity-50"
              rows={2}
              placeholder="Add a comment or suggest a change…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-[11.5px] text-danger leading-snug">{error}</p>
            )}
            {commentText.trim() && (
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                >
                  {isSubmitting ? "Submitting…" : "Submit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    if (isSubmitting) return;
                    onClose();
                    setCommentText("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { CommentThread };
