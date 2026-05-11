"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useMounted } from "@/lib/hooks/use-mounted";

import { CommandPalette } from "./command-palette";
import { type AppState, DocView } from "./doc-view";
import { ProjectSidebar } from "./project-sidebar";
import { RightPane } from "./right-pane";
import { StatusBar } from "./statusbar";
import { TitleBar } from "./titlebar";

type RightTab = "sources" | "chat" | "revisions";

interface EditorShellProps {
  session?: { id: string; title: string } | null;
}

export function EditorShell({ session }: EditorShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen,   setRightOpen]   = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rightTab,    setRightTab]    = useState<RightTab>("sources");
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const theme: "dark" | "light" | null = mounted
    ? resolvedTheme === "light"
      ? "light"
      : "dark"
    : null;
  const toggleTheme = () =>
    setTheme((theme ?? "dark") === "dark" ? "light" : "dark");
  const appState: AppState = session ? "no-sources" : "no-session";

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

        <DocView
          appState={appState}
          sessionName={session?.title ?? null}
          selectedReq={selectedReq}
          onSelectReq={handleSelectReq}
          onAddSources={handleOpenSources}
        />

        {/* Right pane */}
        <div className="overflow-hidden" style={{ minWidth: 0 }}>
          {rightOpen && (
            <RightPane activeTab={rightTab} onTabChange={setRightTab} sessionId={session?.id} />
          )}
        </div>
      </div>

      {/* StatusBar */}
      <StatusBar selectedReq={selectedReq} sessionName={session?.title ?? null} />

      {/* Command palette (portal-like fixed overlay) */}
      {paletteOpen && (
        <CommandPalette onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  );
}
