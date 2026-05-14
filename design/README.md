# Handoff: RequireX — Editor & Client Views

## Overview

RequireX is a requirements engineering tool that ingests heterogeneous sources (PDFs, transcripts, tickets, code) and extracts a structured, traceable set of requirements. This handoff covers two production views:

- **Editor view** — internal tool for the requirements team. Three-pane IDE-style layout with project sidebar, numbered-line document view, inline evidence tracing, AI chat bar, and a collapsible right panel (sources / chat history / revision tree).
- **Client view** — shared-link view for external clients. Clean document layout; clients can comment on requirements and answer open questions inline.

### About these design files

The HTML files in this bundle (`editor.html`, `client.html`, `index.html`) are **high-fidelity design references built in React/Babel**. They show intended look, interactions, and content structure. The task is to **recreate these designs in your real codebase** using its framework (Next.js, Vite + React, etc.) and component library — do not ship the HTML files directly.

### Fidelity

**High-fidelity.** All colors, type sizes, spacing, border radii, shadows, hover/active states, and component names are final. Recreate pixel-accurately using your codebase's patterns.

---

## 1 — Updated `globals.css` Theme Tokens

Drop these CSS variables into your `globals.css` (or equivalent). Both dark (default) and light themes are provided.

```css
/* globals.css — RequireX theme tokens */
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap");

:root {
  /* Fonts */
  --font-sans:
    "Geist", ui-sans-serif, system-ui, -apple-system, Helvetica, Arial,
    sans-serif;
  --font-mono:
    "Geist Mono", ui-monospace, "JetBrains Mono", "SF Mono", Menlo, Consolas,
    monospace;

  /* Base type scale */
  --text-2xs: 10px;
  --text-xs: 11px;
  --text-sm: 12px;
  --text-base: 13px;
  --text-md: 15px; /* body default */
  --text-lg: 17px;
  --text-xl: 21px;
  --text-2xl: 25px;
  --text-3xl: 33px;

  /* Spacing (4px base grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
  --space-9: 56px;

  /* Radii */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* Motion */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-inout: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;

  /* ── Dark theme (default) ──────────────────────── */
  color-scheme: dark;

  --background: #141517;
  --surface-1: #1c1e21; /* sidebars, panels */
  --surface-2: #242628; /* right pane, hover */
  --surface-3: #2d3033; /* active rows, popovers */
  --overlay: rgba(10, 11, 14, 0.75);

  --fg-primary: #efeee9; /* headings, strong text */
  --fg-secondary: #c4c4c9; /* body text */
  --fg-tertiary: #9b9ba2; /* labels, secondary info */
  --fg-muted: #76767e; /* placeholders, disabled */
  --fg-disabled: #56565d;

  --border: #26282c;
  --border-strong: #32353a;
  --border-focus: #44474f;

  --accent: #7a9bb8;
  --accent-subtle: rgba(122, 155, 184, 0.13);
  --accent-ring: rgba(122, 155, 184, 0.48);
  --accent-fg: #06121e; /* text on solid accent bg */

  --success: #7eb486;
  --success-subtle: rgba(126, 180, 134, 0.14);
  --warning: #d4a356;
  --warning-subtle: rgba(212, 163, 86, 0.14);
  --danger: #c4736a;
  --danger-subtle: rgba(196, 115, 106, 0.14);
  --info: #7a9bb8;
  --info-subtle: rgba(122, 155, 184, 0.14);

  /* Syntax highlighting */
  --syn-keyword: #b48cc4;
  --syn-string: #a3c293;
  --syn-number: #d8a373;
  --syn-comment: #6a6a72;
  --syn-fn: #88a8c9;
  --syn-type: #c9b078;

  /* Elevation */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(0, 0, 0, 0.4);
  --shadow-md:
    0 6px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(0, 0, 0, 0.5);
  --shadow-lg:
    0 24px 48px rgba(0, 0, 0, 0.55), 0 8px 16px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(0, 0, 0, 0.5);
}

[data-theme="light"] {
  color-scheme: light;

  --background: #f6f5f1;
  --surface-1: #fbfaf6;
  --surface-2: #ffffff;
  --surface-3: #efeee9;

  --fg-primary: #1a1a1c;
  --fg-secondary: #2f2f33;
  --fg-tertiary: #56565d;
  --fg-muted: #76767e;
  --fg-disabled: #b0b0b6;

  --border: #e6e4dd;
  --border-strong: #d8d6cd;
  --border-focus: #b9b6ab;

  --accent: #3d6b87;
  --accent-subtle: rgba(61, 107, 135, 0.1);
  --accent-ring: rgba(61, 107, 135, 0.38);
  --accent-fg: #ffffff;

  --success: #4f8a5a;
  --warning: #a87527;
  --danger: #a05248;
  --info: #3d6b87;

  --shadow-sm:
    0 1px 2px rgba(34, 30, 22, 0.06), 0 0 0 1px rgba(34, 30, 22, 0.06);
  --shadow-md:
    0 6px 18px rgba(34, 30, 22, 0.1), 0 2px 4px rgba(34, 30, 22, 0.05),
    0 0 0 1px rgba(34, 30, 22, 0.06);
  --shadow-lg:
    0 30px 60px rgba(34, 30, 22, 0.18), 0 8px 16px rgba(34, 30, 22, 0.08),
    0 0 0 1px rgba(34, 30, 22, 0.06);
}

html,
body {
  background: var(--background);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: var(--text-md);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
```

---

## 2 — Tailwind / shadcn Theme Notes

### `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["Geist Mono", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": "10px",
        xs: "11px",
        sm: "12px",
        base: "13px",
        md: "15px",
        lg: "17px",
        xl: "21px",
        "2xl": "25px",
      },
      colors: {
        background: "var(--background)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        accent: {
          DEFAULT: "var(--accent)",
          subtle: "var(--accent-subtle)",
          fg: "var(--accent-fg)",
        },
        fg: {
          1: "var(--fg-primary)",
          2: "var(--fg-secondary)",
          3: "var(--fg-tertiary)",
          4: "var(--fg-muted)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        "ease-out-app": "cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
};
export default config;
```

### shadcn `components.json` + CSS variable mapping

shadcn uses its own CSS variable names. Map them in your `globals.css` alongside the tokens above:

```css
/* shadcn variable bridge — add inside :root / [data-theme="light"] blocks */
:root {
  --background: 14 15 23; /* HSL won't work — use direct mapping below */
  --foreground: var(--fg-primary);

  /* shadcn expects HSL triplets in some setups; if yours does, use oklch values.
     For hex-based shadcn setups, just alias directly: */
  --card: var(--surface-1);
  --card-foreground: var(--fg-primary);
  --popover: var(--surface-2);
  --popover-foreground: var(--fg-primary);
  --primary: var(--accent);
  --primary-foreground: var(--accent-fg);
  --secondary: var(--surface-2);
  --secondary-foreground: var(--fg-primary);
  --muted: var(--surface-1);
  --muted-foreground: var(--fg-tertiary);
  --accent: var(--accent-subtle);
  --accent-foreground: var(--accent);
  --destructive: var(--danger);
  --destructive-foreground: #ffffff;
  --border: var(--border);
  --input: var(--border-strong);
  --ring: var(--accent-ring);
  --radius: 6px; /* matches --radius-md */
}
```

> **Note:** If your shadcn setup requires HSL triplets (`--primary: 203 28% 60%`), convert the hex values using any HSL converter. The semantic structure above is what matters — the exact format depends on your shadcn version.

---

## 3 — Reusable Component List

All components below are stateless atoms unless noted. Build them in `components/ui/` and reference them app-wide.

### Atoms

| Component     | Props                                                                                                              | Notes                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Btn`         | `variant` (primary \| secondary \| ghost \| danger), `size` (sm \| md \| lg), `leading?`, `trailing?`, `disabled?` | 26px tall (md). Primary uses `--accent` bg. No icons default.                                                                                  |
| `IconBtn`     | `active?`, `title`, `size?`                                                                                        | 24×24 square, transparent bg, `--fg-tertiary` icon color. Active state uses `--surface-3` bg + `--accent` icon.                                |
| `Pill`        | `tone` (success \| info \| warning \| danger \| neutral), `dot?`                                                   | 18px tall. Soft bg from semantic palette. 5px dot indicator.                                                                                   |
| `Tag`         | children                                                                                                           | Monospace, 10px, `--surface-2` bg, `--border` outline. Small 1px radius.                                                                       |
| `Kbd`         | children                                                                                                           | Monospace, 10px. Faint border + bg. Used for keyboard shortcuts.                                                                               |
| `EvidenceBit` | `sourceId`, `ref`, `quote`                                                                                         | Inline chip. Shows source icon + ref text. Hover reveals a floating tooltip with source name + quote. Built with `position: relative` tooltip. |

### Layout shells

| Component        | Description                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `AppShell`       | Full-viewport grid: `32px titlebar / 1fr body / 22px statusbar`. Dark bg.                                     |
| `TitleBar`       | macOS-style: traffic lights (decorative) · brand · center search · panel toggles · theme toggle. Height 32px. |
| `StatusBar`      | 22px. Monospace 10.5px. Idle dot · linked count · grow spacer · git info right-aligned.                       |
| `ProjectSidebar` | Width 220px. `--surface-1` bg. Collapsible project tree → chats. Settings footer.                             |
| `DocView`        | Flex column: topbar (32px) · scrollable doc · chatbar. Center of editor layout.                               |
| `RightPane`      | Width 268px. `--surface-2` bg. Tabs: Sources · Chat · Revisions.                                              |
| `CommandPalette` | Fixed overlay + blur backdrop. 540px wide. Keyboard-driven row list.                                          |
| `ClientShell`    | Grid: `48px header / 1fr body`. Optionally adds 240px revision panel column.                                  |
| `ClientHeader`   | 48px. Logo · doc name · spacer · status count · controls · submit button.                                     |
| `RevisionPanel`  | 240px. Git-tree timeline of doc versions.                                                                     |

### Doc view sub-components

| Component                  | Description                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DocLine`                  | Single "line" row: `52px gutter (lineNum)` + `flex-1 content`. Has variants: `h1`, `h2`, `meta`, `req-header`, `req-title`, `body`, `blank`.        |
| `RequirementCard` (client) | Bordered card. Header row: ID + pill + tags + comment button (opacity 0, reveals on hover). Body. Optional question block. Optional comment thread. |
| `QuestionBlock`            | Amber-soft bg block inside a req card. Label + text + textarea for client answer.                                                                   |
| `CommentThread`            | Shown below req body when active. Avatar + textarea or submitted text.                                                                              |
| `RevTree`                  | Vertical git-tree: dot column (8px dots, 1px connector line) + info column (label · time · message).                                                |
| `SourceRow`                | 12px bordered row: source icon + name/meta + status dot.                                                                                            |
| `ChatMsg`                  | Role label (`You` or `RequireX`) + message text. Separated by 1px dividers.                                                                         |

---

## 4 — Page Layout Plan

### Editor view (`/editor` or `/projects/:id`)

```
┌──────────────────────────────────────────────────────────────────┐
│ TitleBar (32px)                                                   │
│  traffic · RequireX · [proj chip]  [search ⌘K]  [sb][panel][☀]  │
├───────────────┬──────────────────────────────┬───────────────────┤
│ ProjectSidebar│                              │ RightPane         │
│ (220px)       │  DocView                     │ (268px, hidden)   │
│ surface-1 bg  │  ─ topbar (32px)             │ surface-2 bg      │
│               │    crumbs · actions          │                   │
│ Logo + name   │  ─ doc-scroll (flex 1)       │ Tabs:             │
│ proj chip     │    numbered lines            │  Sources          │
│               │    h1, h2, req blocks        │  Chat             │
│ [search ⌘K]   │    evidence bits inline      │  Revisions        │
│               │  ─ chatbar (52px)            │                   │
│ project ▸     │    icon · input · upload/send│ RevTree (revisions│
│  chat row     │                              │  tab)             │
│  chat row     │                              │                   │
│ project ▸     │                              │                   │
│               │                              │                   │
│ [new project] │                              │                   │
│ [settings]    │                              │                   │
├───────────────┴──────────────────────────────┴───────────────────┤
│ StatusBar (22px): dot · idle · linked · [spacer] · REQ-id · git  │
└──────────────────────────────────────────────────────────────────┘
```

**Grid:** `grid-template-columns: 220px 1fr [0|268px]` — sidebar and right pane toggle with CSS `transition`. Right pane hidden by default.

**DocView scroll area:** `flex: 1; overflow-y: auto`. The document renders as a flat list of `DocLine` rows. Line numbers are in a fixed 52px left gutter. Clicking any req line highlights all lines belonging to that req (via `reqId` comparison) with `--accent-subtle` bg tint.

**Evidence bits:** Inline within body text at end of last body line. Each bit is a small chip `(source icon + ref text)`. On hover: absolute-positioned tooltip card shows source filename + quote. Z-index 60 to clear the line container.

**ChatBar:** Always visible at bottom of DocView. Single-line input by default. Send on Enter (no shift). Upload icon for source attachment.

---

### Client view (`/review/:token`)

```
┌──────────────────────────────────────────────────────────────────┐
│ ClientHeader (48px)                                               │
│  Rx logo · RequireX · [sep] · doc name  [spacer]  status · [☀] · submit │
├──────────────────────────────────────────────┬───────────────────┤
│ client-doc-wrap (overflow-y: auto)           │ RevisionPanel     │
│ centered, max-width 920px                    │ (240px, optional) │
│                                              │                   │
│  Title (25px, weight 600)                    │ "History" label   │
│  meta row (monospace, muted)                 │ RevTree           │
│                                              │                   │
│  SECTION LABEL ────────────                  │                   │
│  RequirementCard                             │                   │
│    head: id · pill · tags · [Comment ←hover] │                   │
│    title                                     │                   │
│    body                                      │                   │
│    [QuestionBlock if req.question]           │                   │
│    [CommentThread if open/submitted]         │                   │
│  ...                                         │                   │
│                                              │                   │
│  [divider]                                   │                   │
│  [Download PDF] [Submit all feedback →]      │                   │
└──────────────────────────────────────────────┴───────────────────┘
```

**Doc width:** `max-width: 920px; padding: 40px 48px 80px`. Left-aligned at the container edge, not truly centered (left-edge flush with the padding boundary).

**Comment button:** `opacity: 0` by default, `opacity: 1` on `.client-req:hover`. Opens a comment thread inline below the body. Once submitted, shows the comment with an avatar chip ("CL") and role label.

**Question block:** `--warning-subtle` background, 1px amber border. "QUESTION" eyebrow label + question text + `<textarea>` input. On submit: block changes to `--success-subtle` with "Answer submitted" label.

**Revision panel:** Toggles via the History icon in the header. CSS grid column transition from `1fr` to `1fr 240px`.

---

## 5 — Implementation Order

Build in this sequence — each step is independently testable.

### Phase 1 — Foundation (Day 1)

1. **Design tokens** — paste `globals.css` tokens, configure Tailwind, wire up shadcn bridge vars.
2. **Font loading** — add Geist + Geist Mono via `next/font` or Google Fonts import.
3. **Theme toggle** — `data-theme` on `<html>`, persisted to localStorage. Dark default.
4. **Atom components** — `Btn`, `IconBtn`, `Pill`, `Tag`, `Kbd`. Unit test visually with a storybook or simple test page.
5. **Icon set** — wire up Lucide React (`lucide-react`). The design uses 1.5px stroke at 16px. Wrap common icons in a local `Icon` map for easy swapping later.

### Phase 2 — Editor shell (Day 2)

6. **AppShell grid** — three-row grid (titlebar/body/statusbar), body as two or three columns.
7. **TitleBar** — static for now. Add ⌘K handler later.
8. **StatusBar** — static content. Wire up extraction status in Phase 4.
9. **ProjectSidebar** — collapsible project tree. Hard-coded data first, then connect to API.
10. **DocView skeleton** — topbar + empty scroll area + chatbar input (non-functional).

### Phase 3 — Document rendering (Day 3)

11. **`buildDocLines()` utility** — takes `Requirement[]`, returns flat `DocLine[]` array with sequential line numbers.
12. **`DocLine` component** — renders all line type variants. Click handler for req selection.
13. **`EvidenceBit` component** — inline chip with hover tooltip. Pass `source` lookup function as prop.
14. **Req selection state** — clicking a req highlights all its lines. Selected req ID shown in StatusBar.
15. **Right pane** — tabs + Sources / Chat / Revisions content. RevTree sub-component.

### Phase 4 — Editor interactivity (Day 4)

16. **ChatBar** — connect to AI endpoint. Append messages to local log; show in Chat tab.
17. **CommandPalette** — ⌘K shortcut, search filter, keyboard navigation (↑↓ + Enter).
18. **Sidebar panel toggles** — animate grid columns on sidebar/right-pane toggle.
19. **Source ingestion UI** — "Add source" opens a file picker or URL input. Show progress in status bar.
20. **Re-extract flow** — POST to extraction endpoint, poll for status, update doc lines.

### Phase 5 — Client view (Day 5)

21. **ClientShell + ClientHeader** — layout, theme toggle, submit button state.
22. **RequirementCard** — static rendering. Comment button hover state.
23. **CommentThread** — open/submit/display flow per card.
24. **QuestionBlock** — answer input, submit, answered state.
25. **RevisionPanel** — toggle, RevTree with real version history.
26. **Submit all feedback** — aggregate comments + answers, POST to API, show confirmation.

### Phase 6 — Polish (Day 6)

27. **Keyboard navigation** — Tab order through doc, Esc to deselect.
28. **Responsive** — collapse sidebar at < 900px, stack client view at < 600px.
29. **Loading/error states** — skeleton lines during extraction, toast on API error.
30. **Accessibility** — `aria-label` on icon buttons, `role="document"` on doc scroll, focus rings.

---

## Design Tokens Quick Reference

| Token             | Dark      | Light     | Usage                               |
| ----------------- | --------- | --------- | ----------------------------------- |
| `--background`    | `#141517` | `#f6f5f1` | App bg, doc area                    |
| `--surface-1`     | `#1c1e21` | `#fbfaf6` | Left sidebar, title/status bars     |
| `--surface-2`     | `#242628` | `#ffffff` | Right pane, hover rows, popovers    |
| `--surface-3`     | `#2d3033` | `#efeee9` | Active rows, selected state         |
| `--accent`        | `#7a9bb8` | `#3d6b87` | CTAs, active indicator, focus rings |
| `--fg-primary`    | `#efeee9` | `#1a1a1c` | Headings, strong text               |
| `--fg-secondary`  | `#c4c4c9` | `#2f2f33` | Body text                           |
| `--fg-tertiary`   | `#9b9ba2` | `#56565d` | Labels, meta                        |
| `--fg-muted`      | `#76767e` | `#76767e` | Placeholders                        |
| `--border`        | `#26282c` | `#e6e4dd` | Hairline dividers, card borders     |
| `--border-strong` | `#32353a` | `#d8d6cd` | Hover borders, inputs               |
| `--success`       | `#7eb486` | `#4f8a5a` | Approved status                     |
| `--warning`       | `#d4a356` | `#a87527` | Draft, questions                    |
| `--danger`        | `#c4736a` | `#a05248` | Conflict status                     |
| `--info`          | `#7a9bb8` | `#3d6b87` | In-review status                    |

---

## Assets

| File          | Description                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `icons.jsx`   | All icons as inline React SVG components (Lucide-style, 1.5px stroke). Swap for `lucide-react` in production. |
| `bits.jsx`    | Atom components: `Btn`, `IconBtn`, `Pill`, `Tag`, `Kbd`.                                                      |
| `tokens.css`  | Full CSS variable token file — source of truth.                                                               |
| `kit.css`     | All component-level styles. Use as reference; recreate in Tailwind/CSS modules.                               |
| `editor.html` | Full interactive editor prototype.                                                                            |
| `client.html` | Full interactive client review prototype.                                                                     |
| `index.html`  | Demo index linking both views.                                                                                |

> The Rx logo mark is 2 SVG paths (see `icons.jsx` → `Icon.Logo`). At ≥16px render size it reads clearly. Recommended stroke-width: 1.5px.

---

## Key Measurements

| Element               | Value                        |
| --------------------- | ---------------------------- |
| TitleBar height       | 32px                         |
| StatusBar height      | 22px                         |
| ClientHeader height   | 48px                         |
| Left sidebar width    | 220px                        |
| Right pane width      | 268px                        |
| Client revision panel | 240px                        |
| Doc line height       | 21px min                     |
| Doc gutter width      | 52px                         |
| Button height (md)    | 26px                         |
| Button height (sm)    | 22px                         |
| Row height (sidebar)  | 24–26px                      |
| Base font size        | 15px                         |
| Mono font size (IDs)  | 11px                         |
| Icon size (product)   | 14–16px                      |
| Border width          | 1px (never 2px, never 0.5px) |
