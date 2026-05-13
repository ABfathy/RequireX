"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

import { Icons } from "@/components/icons";
import { useIsMac } from "@/lib/hooks/use-is-mac";

interface SettingsPanelProps {
  onClose: () => void;
}

/* ── Section wrapper ─────────────────────────────────── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div
        className="px-5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em]"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </div>
      <div className="px-5 pb-4">{children}</div>
    </div>
  );
}

/* ── Row ─────────────────────────────────────────────── */
function Row({
  icon,
  label,
  children,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  children?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 min-h-[34px]">
      {icon && (
        <span
          className="shrink-0 size-[16px] flex items-center justify-center"
          style={{ color: muted ? "var(--fg-disabled)" : "var(--fg-muted)" }}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <span
        className="flex-1 text-[13px]"
        style={{ color: muted ? "var(--fg-disabled)" : "var(--fg-secondary)" }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

/* ── Coming-soon tag ─────────────────────────────────── */
function Soon() {
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-[0.07em] px-1.5 py-0.5 rounded-[3px]"
      style={{
        background: "var(--surface-3)",
        color: "var(--fg-disabled)",
        border: "1px solid var(--border)",
      }}
    >
      Soon
    </span>
  );
}

/* ── Keyboard shortcut row ───────────────────────────── */
function KbdRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-3 min-h-[28px]">
      <span className="flex-1 text-[12px]" style={{ color: "var(--fg-muted)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={i}
            className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-[3px] text-[10px] font-medium border"
            style={{
              background: "var(--surface-3)",
              borderColor: "var(--border-strong)",
              color: "var(--fg-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}

/* ── Toggle switch ───────────────────────────────────── */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative w-8 h-[18px] rounded-full transition-colors duration-[200ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] shrink-0 cursor-pointer"
      style={{ background: checked ? "var(--accent)" : "var(--surface-3)", border: "1px solid var(--border-strong)" }}
    >
      <span
        className="absolute top-[2px] size-[12px] rounded-full transition-transform duration-[200ms]"
        style={{
          background: checked ? "var(--accent-fg)" : "var(--fg-disabled)",
          left: 2,
          transform: checked ? "translateX(13px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

/* ── Main panel ──────────────────────────────────────── */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme ?? "dark";
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const isMac = useIsMac();
  const mod = isMac ? "⌘" : "Ctrl";
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  /* Close on Escape */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Close on backdrop click */
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const initials = user
    ? ((user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "")).toUpperCase() ||
      user.emailAddresses[0]?.emailAddress[0]?.toUpperCase() ||
      "?"
    : "?";

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User"
    : "Loading…";

  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      onClick={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label="Settings"
    >
      <div
        className="w-full max-w-[440px] rounded-[10px] overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-lg-val)",
          border: "1px solid var(--border-strong)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between h-11 px-5 border-b shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-[13px] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--fg-primary)" }}
          >
            Settings
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex items-center justify-center size-6 rounded-[4px] transition-colors duration-[120ms] hover:bg-[var(--surface-3)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--fg-muted)" }}
          >
            <Icons.X size={13} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* Account */}
          <Section label="Account">
            {/* Avatar + identity */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={displayName}
                  width={36}
                  height={36}
                  priority
                  className="rounded-full shrink-0 object-cover"
                  style={{ border: "1px solid var(--border-strong)" }}
                />
              ) : (
                <div
                  className="size-9 rounded-full shrink-0 flex items-center justify-center text-[13px] font-semibold"
                  style={{
                    background: "var(--accent-subtle)",
                    color: "var(--accent)",
                    border: "1px solid var(--accent-ring)",
                  }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--fg-primary)" }}
                >
                  {displayName}
                </span>
                <span
                  className="text-[11px] truncate"
                  style={{ color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}
                >
                  {email}
                </span>
              </div>
            </div>

            <Row icon={<Icons.Settings size={13} />} label="Manage account">
              <button
                type="button"
                onClick={() => { onClose(); openUserProfile(); }}
                className="text-[11px] transition-colors duration-[120ms] hover:text-[var(--fg-secondary)] focus-visible:outline-none focus-visible:underline cursor-pointer"
                style={{ color: "var(--fg-muted)" }}
              >
                Open ↗
              </button>
            </Row>
          </Section>

          {/* Appearance */}
          <Section label="Appearance">
            <Row
              icon={theme === "dark" ? <Icons.Moon size={13} /> : <Icons.Sun size={13} />}
              label="Dark mode"
            >
              <Toggle
                checked={theme === "dark"}
                onChange={toggleTheme}
                label="Toggle dark mode"
              />
            </Row>
          </Section>

          {/* Keyboard shortcuts */}
          <Section label="Keyboard shortcuts">
            <KbdRow keys={[mod, "K"]} label="Open command menu" />
            <KbdRow keys={[mod, "P"]} label="Switch project" />
            <KbdRow keys={["Esc"]} label="Close overlay" />
            <KbdRow keys={["↵"]} label="Send message" />
          </Section>

          {/* Coming soon */}
          <Section label="Workspace">
            <Row icon={<Icons.FileText size={13} />} label="Workspace settings" muted>
              <Soon />
            </Row>
            <Row icon={<Icons.Send size={13} />} label="Email notifications" muted>
              <Soon />
            </Row>
            <Row icon={<Icons.Share size={13} />} label="Share & permissions" muted>
              <Soon />
            </Row>
          </Section>

          <Section label="Integrations">
            <Row icon={<Icons.Code size={13} />} label="API keys" muted>
              <Soon />
            </Row>
            <Row icon={<Icons.Ticket size={13} />} label="Webhooks" muted>
              <Soon />
            </Row>
          </Section>

        </div>

        {/* Footer — sign out */}
        <div
          className="px-5 py-3 border-t shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full h-8 px-3 rounded-[6px] text-[12px] font-medium transition-colors duration-[120ms] hover:bg-[var(--danger-subtle)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
            style={{ color: "var(--danger)" }}
          >
            <Icons.X size={12} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
