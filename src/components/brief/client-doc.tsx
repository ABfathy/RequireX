"use client";

import { Check, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  type Requirement,
  RequirementCard,
} from "@/components/brief/requirement-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BriefCommentSection } from "../../../generated/prisma/client";

function sectionId(section: string) {
  return section.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function BriefSectionNav({ sections }: { sections: string[] }) {
  const [activeSection, setActiveSection] = useState<string | null>(
    sections[0] ?? null,
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sections.length === 0) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0 && visible[0]) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const el = document.getElementById(sectionId(section));
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Jump to section"
      className="flex w-full overflow-x-auto no-scrollbar border-b border-border mb-4 sticky top-0 z-10"
      style={{ background: "var(--surface-1)" }}
    >
      {sections.map((section) => {
        const id = sectionId(section);
        const isActive = activeSection === id;
        return (
          <button
            key={section}
            type="button"
            onClick={() => {
              const el = document.getElementById(id);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                setActiveSection(id);
              }
            }}
            className={cn(
              "relative flex-1 min-w-[72px] px-2 py-2.5 text-[11px] font-medium whitespace-nowrap text-center cursor-pointer",
              "transition-[color] duration-fast ease-out-app",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent",
              isActive ? "text-fg-1" : "text-fg-4 hover:text-fg-2",
            )}
          >
            {section}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "var(--accent)" }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

interface ClientDocProps {
  title: string;
  meta: {
    project: string;
    version: string;
    reqCount: number;
    label: string;
  };
  requirements: Requirement[];
  /**
   * Page-level comment submit handler.
   * Receives the API target metadata and the comment body text.
   * Should throw a string message on error to surface inline feedback.
   */
  onSubmitComment?: (
    target: {
      section: BriefCommentSection;
      claimId?: string;
      questionId?: string;
    },
    body: string,
  ) => Promise<void>;
  /**
   * Page-level answer submit handler.
   * Receives the questionId UUID and the answer body text.
   * Should throw a string message on error to surface inline feedback.
   */
  onSubmitAnswer?: (questionId: string, body: string) => Promise<void>;
  onDownloadPdf?: () => void;
  isConfirming?: boolean;
  isConfirmed?: boolean;
  confirmError?: string | null;
  onSubmitConfirmation?: () => void;
  showConfirmationControls?: boolean;
}

function ClientDoc({
  title,
  meta,
  requirements,
  onSubmitComment,
  onSubmitAnswer,
  onDownloadPdf,
  isConfirming,
  isConfirmed,
  confirmError,
  onSubmitConfirmation,
  showConfirmationControls = true,
}: ClientDocProps) {
  const sections = [...new Set(requirements.map((r) => r.section))];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center py-6 px-4 pb-16 sm:py-10 sm:px-12 sm:pb-20">
      <div className="w-full max-w-[920px] flex flex-col min-w-0">
        {/* Title */}
        <div className="text-2xl font-semibold tracking-[-0.02em] text-fg-1 leading-[1.2] mb-2">
          {title}
        </div>

        {/* Meta row */}
        <div className="font-mono text-xs text-fg-4 mb-4 flex flex-wrap gap-x-2.5 gap-y-1">
          <span>{meta.project}</span>
          <span className="text-border-focus">·</span>
          <span>{meta.version}</span>
          <span className="text-border-focus">·</span>
          <span>{meta.reqCount} requirements</span>
          <span className="text-border-focus">·</span>
          <span>{meta.label}</span>
        </div>

        {/* Section navigation */}
        <BriefSectionNav sections={sections} />

        {/* Sections */}
        {sections.map((section) => (
          <div key={section} id={sectionId(section)} className="mb-1.5 scroll-mt-10">
            <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-fg-4 py-5 pb-2 border-t border-border mt-2">
              {section}
            </div>
            {requirements
              .filter((r) => r.section === section)
              .map((req) => (
                <RequirementCard
                  key={`${meta.version}:${req.id}`}
                  req={req}
                  onSubmitComment={onSubmitComment}
                  onSubmitAnswer={onSubmitAnswer}
                />
              ))}
          </div>
        ))}

        {/* Bottom actions — "Submit all feedback" belongs to the /confirm flow, not comments */}
        <div className="h-px bg-border my-8 mb-6" />
        <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center gap-2">
          {confirmError && (
            <span className="text-sm text-destructive mr-auto text-right sm:text-left">
              {confirmError}
            </span>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={onDownloadPdf}
              disabled={!onDownloadPdf}
            >
              Download PDF
            </Button>
            {showConfirmationControls &&
              (isConfirmed ? (
                <Button variant="secondary" disabled>
                  <Check size={13} />
                  Feedback submitted
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={isConfirming}
                  onClick={onSubmitConfirmation}
                >
                  {isConfirming ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send size={13} />
                      Submit all feedback
                    </>
                  )}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ClientDoc };
