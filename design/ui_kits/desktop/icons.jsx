/* global React */
const { createElement: h } = React;

// Tiny helper so JSX-less files stay legible. Not used by the JSX components,
// but the icons.jsx file uses h() to keep paths short.
window.__h = h;

// ============================================================
// Iconography — inline Lucide-style SVGs
// 1.5px stroke, currentColor, 16px in product, 20px in marketing.
// ============================================================

const Svg = ({ size = 16, sw = 1.5, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

const Icon = {
  ChevronLeft:  (p) => <Svg {...p}><path d="M15 6l-6 6 6 6"/></Svg>,
  ChevronRight: (p) => <Svg {...p}><path d="M9 6l6 6-6 6"/></Svg>,
  ChevronDown:  (p) => <Svg {...p}><path d="M6 9l6 6 6-6"/></Svg>,
  Search:       (p) => <Svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Svg>,
  Filter:       (p) => <Svg {...p}><path d="M3 6h18M6 12h12M10 18h4"/></Svg>,
  Doc:          (p) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></Svg>,
  DocLines:     (p) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/></Svg>,
  Mic:          (p) => <Svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></Svg>,
  Ticket:       (p) => <Svg {...p}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M10 6v12" strokeDasharray="2 2"/></Svg>,
  Code:         (p) => <Svg {...p}><path d="M9 7l-5 5 5 5"/><path d="M15 7l5 5-5 5"/></Svg>,
  Folder:       (p) => <Svg {...p}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>,
  Plus:         (p) => <Svg {...p}><path d="M12 5v14M5 12h14"/></Svg>,
  Link:         (p) => <Svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></Svg>,
  Trace:        (p) => <Svg {...p}><circle cx="12" cy="12" r="3"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></Svg>,
  More:         (p) => <Svg {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Svg>,
  Cog:          (p) => <Svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 4.6V4a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V10a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>,
  Check:        (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></Svg>,
  Warn:         (p) => <Svg {...p}><path d="M12 9v4"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></Svg>,
  Clock:        (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>,
  ArrowRight:   (p) => <Svg {...p}><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></Svg>,
  Comment:      (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>,
  Logo:         (p) => <Svg {...p}><path d="M5 25 L16 6 L27 25" /><path d="M10.2 18 L21.8 18" strokeWidth="1.4"/><circle cx="16" cy="6" r="0.9" fill="currentColor" stroke="none"/></Svg>,
  Sidebar:      (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></Svg>,
  Inspector:    (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></Svg>,
  Refresh:      (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></Svg>,
};

window.Icon = Icon;
