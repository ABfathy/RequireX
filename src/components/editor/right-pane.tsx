"use client";

import { Icons } from "@/components/icons";

type RightTab = "sources" | "chat" | "revisions";

interface RightPaneProps {
  activeTab: RightTab;
  onTabChange: (tab: RightTab) => void;
}

const TABS: { id: RightTab; label: string }[] = [
  { id: "sources", label: "Sources" },
  { id: "chat", label: "Chat" },
  { id: "revisions", label: "Revisions" },
];

export function RightPane({ activeTab, onTabChange }: RightPaneProps) {
  return (
    <aside
      className="flex flex-col h-full overflow-hidden border-l"
      style={{
        width: 268,
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      {/* Tabs */}
      <div
        className="flex items-center h-8 px-1 shrink-0 border-b gap-0.5"
        style={{ borderColor: "var(--border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="relative h-full px-3 text-[12px] font-medium transition-colors duration-[120ms] cursor-pointer"
            style={{
              color: activeTab === tab.id ? "var(--fg-primary)" : "var(--fg-tertiary)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "sources" && <SourcesTab />}
        {activeTab === "chat" && <ChatTab />}
        {activeTab === "revisions" && <RevisionsTab />}
      </div>
    </aside>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      <div style={{ color: "var(--fg-disabled)" }}>{icon}</div>
      <p className="text-[11px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
        {message}
      </p>
    </div>
  );
}

function SourcesTab() {
  return (
    <>
      <SectionLabel>Ingested sources</SectionLabel>
      <EmptyState
        icon={<Icons.FileText size={20} />}
        message={"No sources added yet.\nUpload files or paste text in the chat."}
      />
      <div className="px-3 pb-3">
        <button
          type="button"
          className="flex items-center gap-1.5 h-[26px] px-2 rounded-[5px] text-[11px] border transition-colors duration-[120ms] hover:bg-[var(--surface-3)] cursor-pointer w-full"
          style={{
            color: "var(--fg-tertiary)",
            borderColor: "var(--border)",
            background: "transparent",
          }}
        >
          <Icons.Plus size={12} />
          <span>Add source</span>
        </button>
      </div>
    </>
  );
}

function ChatTab() {
  return (
    <>
      <SectionLabel>Chat history</SectionLabel>
      <EmptyState
        icon={<Icons.MessageSquare size={20} />}
        message={"No messages yet.\nUse the chat bar below to get started."}
      />
    </>
  );
}

function RevisionsTab() {
  return (
    <>
      <SectionLabel>Revision history</SectionLabel>
      <EmptyState
        icon={<Icons.History size={20} />}
        message={"No revisions yet.\nRevisions appear after the first extraction."}
      />
    </>
  );
}
