import { cn } from "@/lib/utils";

interface RxLogoProps {
  size?: number;
  className?: string;
}

function RxLogo({ size = 16, className }: RxLogoProps) {
  return (
    // mix-blend-mode:screen makes the black background transparent,
    // showing only the neon teal lines on any background colour.
    <img
      src="/rx-logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0", className)}
      style={{ mixBlendMode: "screen", display: "inline-block" }}
    />
  );
}

export { RxLogo };
