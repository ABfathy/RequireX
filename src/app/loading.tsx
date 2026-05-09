export default function RootLoading() {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div
        className="rounded-[6px] border px-4 py-2.5 text-[13px]"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
          color: "var(--fg-tertiary)",
        }}
      >
        Loading RequireX…
      </div>
    </main>
  );
}
