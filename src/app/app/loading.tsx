function Bone({ w, h = 10 }: { w: string; h?: number }) {
  return (
    <div
      className="rounded-[3px] animate-pulse shrink-0"
      style={{ width: w, height: h, background: "var(--surface-3)" }}
    />
  );
}

export default function AppLoading() {
  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* TitleBar */}
      <div
        className="flex items-center h-8 px-3 gap-3 border-b shrink-0"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Bone w="13px" h={13} />
          <Bone w="64px" h={10} />
        </div>
        {/* Center search */}
        <div className="flex-1 flex justify-center px-4">
          <Bone w="280px" h={22} />
        </div>
        {/* Right icons */}
        <Bone w="24px" h={22} />
        <Bone w="24px" h={22} />
        <Bone w="24px" h={22} />
      </div>

      {/* Body */}
      <div
        className="flex-1 overflow-hidden"
        style={{ display: "grid", gridTemplateColumns: "220px 1fr" }}
      >
        {/* Sidebar */}
        <div
          className="flex flex-col h-full border-r overflow-hidden"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex flex-col px-2 pt-3 gap-2 flex-1">
            <Bone w="100%" h={26} />
            <div className="h-1" />
            <Bone w="70%" />
            <Bone w="85%" />
            <Bone w="60%" />
          </div>
          <div
            className="h-9 border-t flex items-center px-2 gap-1"
            style={{ borderColor: "var(--border)" }}
          >
            <Bone w="100px" h={22} />
            <span className="flex-1" />
            <Bone w="24px" h={24} />
          </div>
        </div>

        {/* DocView */}
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{ background: "var(--background)" }}
        >
          <div
            className="flex items-center h-8 px-4 gap-3 shrink-0 border-b"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--border)",
            }}
          >
            <Bone w="120px" />
            <span className="flex-1" />
            <Bone w="48px" h={22} />
            <Bone w="80px" h={22} />
          </div>
          <div className="flex-1 py-6 px-[52px] flex flex-col gap-3">
            <Bone w="40%" h={24} />
            <Bone w="90%" />
            <Bone w="75%" />
            <Bone w="83%" />
            <div className="mt-4" />
            <Bone w="35%" h={18} />
            <Bone w="88%" />
            <Bone w="70%" />
          </div>
          <div
            className="shrink-0 border-t h-[52px]"
            style={{
              borderColor: "var(--border)",
              background: "var(--background)",
            }}
          />
        </div>
      </div>

      {/* StatusBar */}
      <div
        className="flex items-center h-[22px] px-3 gap-2 border-t shrink-0"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <Bone w="6px" h={6} />
        <Bone w="60px" />
        <Bone w="4px" />
        <Bone w="100px" />
      </div>
    </div>
  );
}
