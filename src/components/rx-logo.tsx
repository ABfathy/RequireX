import { cn } from "@/lib/utils";

interface RxLogoProps {
  size?: number;
  className?: string;
}

function RxLogo({ size = 16, className }: RxLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rx-logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 rx-logo-img", className)}
    />
  );
}

export { RxLogo };
