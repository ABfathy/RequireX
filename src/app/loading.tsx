import { RxLogo } from "@/components/icons";

function Bone({ w, h = 10 }: { w: string; h?: number }) {
  return (
    <div
      className="rounded-[3px] animate-pulse shrink-0"
      style={{ width: w, height: h, background: "var(--surface-3)" }}
    />
  );
}

function NavCardBone() {
  return (
    <div
      className="p-4 rounded-[8px] border flex flex-col gap-2"
      style={{
        background: "var(--surface-1)",
        borderColor: "var(--border)",
      }}
    >
      <Bone w="50%" h={10} />
      <Bone w="90%" h={10} />
    </div>
  );
}

export default function RootLoading() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-[480px]">
        {/* Brand — real logo + wordmark, preserved across the transition */}
        <div className="flex items-center gap-2.5 mb-8">
          <RxLogo size={22} className="text-[var(--accent)]" />
          <span
            className="text-[17px] font-semibold tracking-[-0.01em]"
            style={{ color: "var(--fg-primary)" }}
            translate="no"
          >
            RequireX
          </span>
        </div>

        {/* Headline bones */}
        <div className="flex flex-col gap-2 mb-4">
          <Bone w="100%" h={28} />
          <Bone w="60%" h={28} />
        </div>

        {/* Description bones */}
        <div className="flex flex-col gap-2 mb-8">
          <Bone w="100%" h={12} />
          <Bone w="95%" h={12} />
          <Bone w="60%" h={12} />
        </div>

        {/* CTA bones */}
        <div className="flex items-center gap-2 mb-10">
          <Bone w="120px" h={34} />
          <Bone w="90px" h={34} />
        </div>

        {/* Divider */}
        <div className="h-px mb-8" style={{ background: "var(--border)" }} />

        {/* Nav card bones */}
        <div className="grid grid-cols-2 gap-3">
          <NavCardBone />
          <NavCardBone />
        </div>
      </div>
    </main>
  );
}
