"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface QuestionBlockProps {
  question: string;
  onSubmitAnswer?: (answer: string) => void;
}

function QuestionBlock({ question, onSubmitAnswer }: QuestionBlockProps) {
  const [answerText, setAnswerText] = useState("");
  const [answered, setAnswered] = useState(false);

  const handleSubmit = () => {
    if (!answerText.trim()) return;
    setAnswered(true);
    onSubmitAnswer?.(answerText.trim());
  };

  if (answered) {
    return (
      <div className="mt-2.5 p-2.5 px-3 rounded-md border border-success/30 bg-success-subtle">
        <div className="text-[10px] font-medium uppercase tracking-[0.07em] text-success mb-1">
          Answer submitted
        </div>
        <div className="text-[12.5px] text-fg-1 leading-normal p-1.5 px-[9px] bg-surface-2 rounded-sm border border-border">
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
      <div className="text-[12.5px] text-fg-2 leading-normal mb-2">
        {question}
      </div>
      <label htmlFor="question-answer-input" className="sr-only">Your answer</label>
      <textarea
        id="question-answer-input"
        className="w-full bg-surface-1 border border-border rounded-sm p-1.5 px-[9px] font-sans text-[12.5px] text-fg-1 resize-none transition-colors duration-fast ease-out-app focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-1 focus-visible:ring-accent placeholder:text-fg-4"
        rows={2}
        placeholder="Type your answer…"
        value={answerText}
        onChange={(e) => setAnswerText(e.target.value)}
        autoComplete="off"
      />
      {answerText.trim() && (
        <div className="mt-1.5">
          <Button variant="default" size="sm" onClick={handleSubmit}>
            Submit answer
          </Button>
        </div>
      )}
    </div>
  );
}

export { QuestionBlock };
