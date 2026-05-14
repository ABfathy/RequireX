import { cn } from "@/lib/utils";

interface RxLogoProps {
  size?: number;
  className?: string;
}

function RxLogo({ size = 16, className }: RxLogoProps) {
  return (
    // mix-blend-mode:screen makes the black background transparent,
    // showing only the neon teal lines on any background colour.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rx-logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rx-logo-img", className)}
      style={{}}
    />
  );
}

export { RxLogo };
