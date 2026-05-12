import {
  ArrowRight,
  Check,
  ChevronRight,
  Code,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  type LucideProps,
  MessageSquare,
  Mic,
  Moon,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Share2,
  Sun,
  Ticket,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { FC } from "react";

function icon(Icon: FC<LucideProps>) {
  const Wrapped = ({ size = 16, strokeWidth = 1.5, ...props }: LucideProps) => (
    <Icon size={size} strokeWidth={strokeWidth} {...props} />
  );
  Wrapped.displayName = Icon.displayName ?? Icon.name;
  return Wrapped;
}

export const Icons = {
  Search:       icon(Search),
  Sidebar:      icon(PanelLeft),
  PanelRight:   icon(PanelRight),
  Sun:          icon(Sun),
  Moon:         icon(Moon),
  ChevronRight: icon(ChevronRight),
  Plus:         icon(Plus),
  Settings:     icon(Settings),
  MessageSquare: icon(MessageSquare),
  Upload:       icon(Upload),
  Send:         icon(Send),
  Filter:       icon(Filter),
  Eye:          icon(Eye),
  Download:     icon(Download),
  Share:        icon(Share2),
  History:      icon(History),
  FileText:     icon(FileText),
  Mic:          icon(Mic),
  Ticket:       icon(Ticket),
  Code:         icon(Code),
  Refresh:      icon(RefreshCw),
  Trash:        icon(Trash2),
  Check:        icon(Check),
  X:            icon(X),
  ArrowRight:   icon(ArrowRight),
  Pencil:       icon(Pencil),
} as const;

export function RxLogo({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 2h6a3 3 0 0 1 0 6H3V2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 8l4 6M3 8v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
