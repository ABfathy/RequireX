export default function SignUpLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div
        className="size-8 rounded-full border-2 animate-spin"
        style={{
          borderColor: "var(--border-strong)",
          borderTopColor: "var(--accent)",
        }}
      />
    </main>
  );
}
