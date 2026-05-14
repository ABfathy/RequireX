import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Code,
  Copy,
  Download,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  GitCompareArrows,
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
  Search: icon(Search),
  Sidebar: icon(PanelLeft),
  PanelRight: icon(PanelRight),
  Sun: icon(Sun),
  Moon: icon(Moon),
  ChevronRight: icon(ChevronRight),
  Plus: icon(Plus),
  Settings: icon(Settings),
  MessageSquare: icon(MessageSquare),
  Upload: icon(Upload),
  Send: icon(Send),
  Filter: icon(Filter),
  Eye: icon(Eye),
  Download: icon(Download),
  Share: icon(Share2),
  History: icon(History),
  GitCompare: icon(GitCompareArrows),
  FileText: icon(FileText),
  Mic: icon(Mic),
  Ticket: icon(Ticket),
  Code: icon(Code),
  Refresh: icon(RefreshCw),
  Trash: icon(Trash2),
  Check: icon(Check),
  Copy: icon(Copy),
  X: icon(X),
  ArrowLeft: icon(ArrowLeft),
  ArrowRight: icon(ArrowRight),
  Pencil: icon(Pencil),
  Folder: icon(FolderOpen),
} as const;

export function RxLogo({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/rx-logo.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={className}
      style={{ mixBlendMode: "screen", display: "inline-block", flexShrink: 0 }}
    />
  );
}
