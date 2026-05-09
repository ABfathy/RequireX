"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CommentThreadProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitComment?: (comment: string) => void;
}

function CommentThread({ isOpen, onClose, onSubmitComment }: CommentThreadProps) {
  const [commentText, setCommentText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    setSubmitted(true);
    onSubmitComment?.(commentText.trim());
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
            <textarea
              className="w-full bg-surface-1 border border-border rounded-md p-[7px] px-2.5 font-sans text-[12.5px] text-fg-1 outline-none resize-none min-h-9 transition-colors duration-fast ease-out-app focus:border-border-strong placeholder:text-fg-4"
              rows={2}
              autoFocus
              placeholder="Add a comment or suggest a change…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            {commentText.trim() && (
              <div className="flex gap-1.5">
                <Button variant="default" size="sm" onClick={handleSubmit}>
                  Submit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClose();
                    setCommentText("");
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
