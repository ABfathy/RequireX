"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";

interface ProjectSettingsModalProps {
  projectId: string;
  initialName: string;
  initialClientName: string;
  onClose: () => void;
  onSaved: (name: string, clientName: string) => void;
}

export function ProjectSettingsModal({
  projectId,
  initialName,
  initialClientName,
  onClose,
  onSaved,
}: ProjectSettingsModalProps) {
  const [name, setName] = useState(initialName);
  const [clientName, setClientName] = useState(initialClientName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedClient = clientName.trim();
    if (!trimmedName) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          clientName: trimmedClient || trimmedName,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? "Failed to save.");
      }
      onSaved(trimmedName, trimmedClient || trimmedName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--overlay)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-[420px] rounded-[10px] overflow-hidden"
        style={{
          background: "var(--surface-2)",
          boxShadow: "var(--shadow-lg-val)",
          border: "1px solid var(--border-strong)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-11 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[13px] font-medium"
            style={{ color: "var(--fg-primary)" }}
          >
            Project settings
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center size-[24px] rounded-[4px] hover:bg-[var(--surface-3)] transition-colors duration-[100ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <Icons.X size={12} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => void handleSave(e)}
          className="p-4 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="proj-name"
              className="text-[11px] font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              Project name
            </label>
            <input
              id="proj-name"
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-[32px] rounded-[5px] border px-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
              style={{
                background: "var(--surface-1)",
                borderColor: "var(--border-strong)",
                color: "var(--fg-primary)",
              }}
              placeholder="Project name"
              autoComplete="off"
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="proj-client"
              className="text-[11px] font-medium"
              style={{ color: "var(--fg-secondary)" }}
            >
              Client name
            </label>
            <input
              id="proj-client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="h-[32px] rounded-[5px] border px-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)]"
              style={{
                background: "var(--surface-1)",
                borderColor: "var(--border-strong)",
                color: "var(--fg-primary)",
              }}
              placeholder="Client name"
              autoComplete="off"
              disabled={saving}
            />
          </div>

          {error && (
            <p className="text-[11px]" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-[28px] px-3 rounded-[5px] text-[12px] transition-colors duration-[100ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer disabled:opacity-40"
              style={{ color: "var(--fg-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="h-[28px] px-3 rounded-[5px] text-[12px] font-medium transition-colors duration-[100ms] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer disabled:opacity-40"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
