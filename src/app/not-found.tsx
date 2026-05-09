import Link from "next/link";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div
        className="max-w-lg w-full rounded-[8px] border p-6"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--fg-muted)" }}
        >
          404
        </p>
        <h1
          className="mt-3 text-[21px] font-semibold tracking-[-0.02em]"
          style={{ color: "var(--fg-primary)" }}
        >
          This route does not exist.
        </h1>
        <p
          className="mt-3 text-[13px] leading-[1.65]"
          style={{ color: "var(--fg-tertiary)" }}
        >
          The requested page could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center h-[34px] px-4 rounded-[6px] text-[13px] font-medium border transition-colors duration-[120ms]"
          style={{
            color: "var(--fg-secondary)",
            borderColor: "var(--border-strong)",
            background: "transparent",
          }}
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
