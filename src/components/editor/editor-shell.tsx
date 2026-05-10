"use client";

import { useEffect, useState } from "react";

import { useTheme } from "@/lib/hooks/use-theme";

import { CommandPalette } from "./command-palette";
import { DocView } from "./doc-view";
import { ProjectSidebar } from "./project-sidebar";
import { RightPane } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

export function EditorShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen,   setRightOpen]   = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rightTab,    setRightTab]    = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  /* ⌘K shortcut */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelectReq(id: string) {
    setSelectedReq((cur) => (cur === id ? null : id));
  }

  function handleOpenSources() {
    setRightOpen(true);
    setRightTab("sources");
  }

  /* Body grid columns based on panel state */
  const colTemplate = [
    sidebarOpen ? "220px" : "0px",
    "1fr",
    rightOpen ? "268px" : "0px",
  ].join(" ");

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* TitleBar */}
      <TitleBar
        sidebarOpen={sidebarOpen}
        rightOpen={rightOpen}
        theme={theme}
        onToggleSidebar={() => setSidebarOpen((p) => !p)}
        onToggleRight={() => setRightOpen((p) => !p)}
        onToggleTheme={toggleTheme}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* Body */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: colTemplate,
          transition: "grid-template-columns 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {/* Sidebar */}
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {sidebarOpen && (
            <ProjectSidebar onOpenPalette={() => setPaletteOpen(true)} />
          )}
        </div>

        {/* DocView — no real session yet, so state is "no-session" */}
        <DocView
          appState="no-session"
          sessionName={null}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
        />

        {/* Right pane */}
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {rightOpen && (
            <RightPane activeTab={rightTab} onTabChange={setRightTab} />
          )}
        </div>
      </div>

      {/* StatusBar */}
      <StatusBar selectedReq={selectedReq} sessionName={null} />

      {/* Command palette (portal-like fixed overlay) */}
      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}
