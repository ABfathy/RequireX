# RequireX — Desktop UI Kit

A pixel recreation of RequireX's main three-pane desktop app. Use this as the source of truth for any high-fidelity RequireX mock.

## Files

| File | What it is |
|---|---|
| `index.html` | Interactive shell with sidebar / editor / inspector. Demonstrates source selection, requirement extraction, and the command palette. |
| `Shell.jsx` | Three-pane app frame: title bar + sidebar + main + inspector + status bar. |
| `Sidebar.jsx` | Source tree with collapsible groups, status dots, active rail, and a "+ Add source" footer. |
| `Editor.jsx` | Requirements editor — list view with inline IDs, status pills, body, tags, trace count. |
| `Inspector.jsx` | Right-side detail panel: requirement metadata, traced source quotes, syntax-highlighted code. |
| `CommandPalette.jsx` | ⌘K palette with sections, kbd hints, and active row. |
| `bits.jsx` | Atoms: `Btn`, `IconBtn`, `Pill`, `Tag`, `Kbd`, `Crumb`, `Field`. |
| `icons.jsx` | Inline Lucide-style SVGs as React components — no CDN at runtime. |

## What is faked vs real

- **Real:** layout, density, type ramp, color tokens, hover/active states, the look of every chrome element.
- **Faked:** extraction is hard-coded; the palette only navigates between two scripted states; sources are mocked.

The kit is **cosmetic** — copy components into a real prototype, replace mocked data with live state.
