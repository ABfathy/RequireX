/* global React */
const _h = React.createElement;

const Svg = ({ size = 16, sw = 1.5, children, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const Icon = {
  // Navigation
  ChevronRight: (p) => <Svg {...p}><path d="M9 6l6 6-6 6"/></Svg>,
  ChevronLeft:  (p) => <Svg {...p}><path d="M15 6l-6 6 6 6"/></Svg>,
  ChevronDown:  (p) => <Svg {...p}><path d="M6 9l6 6 6-6"/></Svg>,
  ArrowRight:   (p) => <Svg {...p}><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></Svg>,
  ArrowLeft:    (p) => <Svg {...p}><path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/></Svg>,
  X:            (p) => <Svg {...p}><path d="M18 6L6 18M6 6l12 12"/></Svg>,

  // UI
  Search:    (p) => <Svg {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Svg>,
  Filter:    (p) => <Svg {...p}><path d="M3 6h18M6 12h12M10 18h4"/></Svg>,
  Sidebar:   (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></Svg>,
  PanelRight:(p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></Svg>,
  More:      (p) => <Svg {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Svg>,
  Plus:      (p) => <Svg {...p}><path d="M12 5v14M5 12h14"/></Svg>,
  Cog:       (p) => <Svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Svg>,
  Moon:      (p) => <Svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></Svg>,
  Sun:       (p) => <Svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Svg>,
  Send:      (p) => <Svg {...p}><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/></Svg>,
  Upload:    (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Svg>,
  Check:     (p) => <Svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></Svg>,
  Link:      (p) => <Svg {...p}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7L12 19.5"/></Svg>,

  // Sources
  Doc:        (p) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></Svg>,
  DocLines:   (p) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/></Svg>,
  Mic:        (p) => <Svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></Svg>,
  Ticket:     (p) => <Svg {...p}><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M10 6v12" strokeDasharray="2 2"/></Svg>,
  Code:       (p) => <Svg {...p}><path d="M9 7l-5 5 5 5"/><path d="M15 7l5 5-5 5"/></Svg>,

  // Workflow
  GitBranch:  (p) => <Svg {...p}><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></Svg>,
  History:    (p) => <Svg {...p}><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></Svg>,
  MessageSq:  (p) => <Svg {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Svg>,
  Trace:      (p) => <Svg {...p}><circle cx="12" cy="12" r="3"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></Svg>,
  Refresh:    (p) => <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></Svg>,
  Download:   (p) => <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Svg>,
  Share:      (p) => <Svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></Svg>,
  Warn:       (p) => <Svg {...p}><path d="M10.3 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Svg>,
  Eye:        (p) => <Svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Svg>,

  // Logo — Rx mark (prescription symbol, geometric)
  Logo: (p) => (
    <Svg {...p}>
      <path d="M4 4 v16 M4 4 h10 q4 0 4 4 q0 4-4 4 H4"/>
      <path d="M10.5 12 l8.5 8 M16 12 l-5.5 8"/>
    </Svg>
  ),
};

window.Icon = Icon;
