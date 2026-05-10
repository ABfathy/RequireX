"use client";

import { Send } from "lucide-react";

import {
  type Requirement,
  RequirementCard,
} from "@/components/brief/requirement-card";
import { Button } from "@/components/ui/button";

interface ClientDocProps {
  title: string;
  meta: {
    project: string;
    version: string;
    reqCount: number;
    label: string;
  };
  requirements: Requirement[];
}

function ClientDoc({ title, meta, requirements }: ClientDocProps) {
  const sections = [...new Set(requirements.map((r) => r.section))];

  return (
    <div className="flex-1 overflow-auto flex flex-col items-center py-6 px-4 pb-16 sm:py-10 sm:px-12 sm:pb-20">
      <div className="w-full max-w-[920px] flex flex-col">
        {/* Title */}
        <div className="text-2xl font-semibold tracking-[-0.02em] text-fg-1 leading-[1.2] mb-2">
          {title}
        </div>

        {/* Meta row */}
        <div className="font-mono text-xs text-fg-4 mb-8 flex flex-wrap gap-x-2.5 gap-y-1">
          <span>{meta.project}</span>
          <span className="text-border-focus">·</span>
          <span>{meta.version}</span>
          <span className="text-border-focus">·</span>
          <span>{meta.reqCount} requirements</span>
          <span className="text-border-focus">·</span>
          <span>{meta.label}</span>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section} className="mb-1.5">
            <div className="text-[10px] font-medium uppercase tracking-[0.09em] text-fg-4 py-5 pb-2 border-t border-border mt-2">
              {section}
            </div>
            {requirements
              .filter((r) => r.section === section)
              .map((req) => (
                <RequirementCard key={req.id} req={req} />
              ))}
          </div>
        ))}

        {/* Bottom actions */}
        <div className="h-px bg-border my-8 mb-6" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary">Download PDF</Button>
          <Button variant="default">
            <Send size={13} />
            Submit all feedback
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ClientDoc };
