import { cn } from "@/lib/utils";

interface RxLogoProps {
  size?: number;
  className?: string;
}

function RxLogo({ size = 16, className }: RxLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      <path d="M4 4 v16 M4 4 h10 q4 0 4 4 q0 4-4 4 H4" />
      <path d="M10.5 12 l8.5 8 M16 12 l-5.5 8" />
    </svg>
  );
}

export { RxLogo };
