function Bone({
  w,
  h = 10,
  className = "",
}: {
  w: string;
  h?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[3px] animate-pulse shrink-0 ${className}`}
      style={{ width: w, height: h, background: "var(--surface-3)" }}
    />
  );
}

function SectionHeader({ width }: { width: string }) {
  return (
    <>
      <div className="border-t mt-2" style={{ borderColor: "var(--border)" }} />
      <div className="py-5 pb-2">
        <Bone w={width} h={9} />
      </div>
    </>
  );
}

function RequirementBone({
  titleWidth,
  body,
}: {
  titleWidth: string;
  body: readonly string[];
}) {
  return (
    <div
      className="border rounded-lg p-4 px-[18px] mb-2"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Bone w="64px" h={9} />
        <Bone w="78px" h={18} />
        <span className="flex-1" />
        <Bone w="54px" h={18} className="hidden sm:block" />
        <Bone w="42px" h={18} className="hidden sm:block" />
      </div>
      <Bone w={titleWidth} h={12} />
      <div className="h-3" />
      <div className="flex flex-col gap-1.5">
        {body.map((w, i) => (
          <Bone key={i} w={w} h={9} />
        ))}
      </div>
    </div>
  );
}

export default function BriefLoading() {
  return (
    <div
      className="grid grid-rows-[48px_1fr] h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Header strip — mirrors ClientHeader (h-12) */}
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-[7px] shrink-0">
          <Bone w="15px" h={15} />
          <Bone w="56px" h={10} className="hidden sm:block" />
        </div>
        <div
          className="hidden sm:block w-px h-4 shrink-0"
          style={{ background: "var(--border)" }}
        />
        {/* Doc name + version */}
        <Bone w="110px" h={10} />
        <Bone w="56px" h={9} className="hidden xs:block" />

        <span className="flex-1" />

        {/* Req counter */}
        <Bone w="96px" h={8} className="hidden md:block" />
        {/* IconBtns */}
        <Bone w="24px" h={24} />
        <Bone w="24px" h={24} />
        {/* Submit */}
        <Bone w="108px" h={28} />
      </div>

      {/* Doc area — centered 920px column, mirrors ClientDoc */}
      <div className="overflow-hidden flex justify-center py-6 px-4 sm:py-10 sm:px-12">
        <div className="w-full max-w-[920px] flex flex-col">
          {/* Title */}
          <Bone w="62%" h={22} />

          {/* Meta row — mono separators */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-8 mt-3">
            <Bone w="84px" h={8} />
            <Bone w="6px" h={8} />
            <Bone w="64px" h={8} />
            <Bone w="6px" h={8} />
            <Bone w="104px" h={8} />
            <Bone w="6px" h={8} />
            <Bone w="118px" h={8} />
          </div>

          {/* Section 1 */}
          <SectionHeader width="172px" />
          <RequirementBone titleWidth="72%" body={["100%", "92%", "64%"]} />
          <RequirementBone titleWidth="58%" body={["96%", "78%"]} />
          <RequirementBone titleWidth="66%" body={["100%", "88%", "70%"]} />

          {/* Section 2 */}
          <SectionHeader width="148px" />
          <RequirementBone titleWidth="54%" body={["94%", "72%"]} />
        </div>
      </div>
    </div>
  );
}
