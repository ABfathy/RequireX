"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

interface QuestionBlockProps {
  question: string;
  /** Async handler owned by the page. Throw a string message to surface an inline error. */
  onSubmitAnswer?: (answer: string) => Promise<void>;
}

function QuestionBlock({ question, onSubmitAnswer }: QuestionBlockProps) {
  const textareaId = useId();
  const [answerText, setAnswerText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const body = answerText.trim();
    if (!body || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmitAnswer?.(body);
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

  if (submitted) {
    return (
      <div className="mt-2.5 p-2.5 px-3 rounded-md border border-success/30 bg-success-subtle">
        <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-success mb-1">
          Answer submitted
        </div>
        <div className="text-[12.5px] text-fg-1 leading-normal p-1.5 px-[9px] bg-surface-2 rounded-sm border border-border break-words">
          {answerText}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5 p-2.5 px-3 rounded-md border border-warning/30 bg-warning-subtle">
      <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-warning mb-1">
        Question
      </div>
      <div className="text-[12.5px] text-fg-2 leading-normal mb-2 break-words">
        {question}
      </div>
      <label htmlFor={textareaId} className="sr-only">
        Your answer
      </label>
      <textarea
        id={textareaId}
        className="w-full bg-surface-1 border border-border rounded-sm p-1.5 px-[9px] font-sans text-[12.5px] text-fg-1 resize-none transition-colors duration-fast ease-out-app focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-accent placeholder:text-fg-4 disabled:opacity-50"
        rows={2}
        placeholder="Type your answer…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        autoComplete="off"
        disabled={isSubmitting}
      />
      {error && (
        <p className="text-[11.5px] text-danger leading-snug mt-1">{error}</p>
      )}
      {answerText.trim() && (
        <div className="mt-1.5">
          <Button
            variant="default"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit answer"}
          </Button>
        </div>
      )}
    </div>
  );
}

export { QuestionBlock };
