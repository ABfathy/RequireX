# RequireX Design System

> Requirements, traced to source.

**RequireX** is a desktop‑class requirements engineering platform. It ingests heterogeneous sources — PDFs, transcripts, tickets, emails, source code, RFPs — and extracts a structured, traceable set of requirements that engineers can review, refine, and ship against.

The product feels like a coding IDE, not a SaaS dashboard. It is built for technical users who live in keyboards and panels: dense information, monospace details, low chrome, no marketing gloss inside the app.

---

## Brand position

| | |
|---|---|
| **Audience** | Systems engineers, technical PMs, regulated‑industry teams (aero, med, automotive), platform leads. |
| **Reference frame** | VS Code, Claude Code, Linear, Codex, Zed. |
| **What it is not** | A document editor. A wiki. A Jira clone. A "vibes" AI app. |
| **Personality** | Quiet. Precise. A craftsman's tool. The product trusts the user to know what they're doing. |

## Sources

This system was created from a written brief, not from existing source material. There is **no attached codebase, Figma file, or design archive**. All visual decisions in this repo are an original interpretation of the brief:

> "A requirements engineering app that extracts info from different sources. Design system similar to desktop coding apps like Codex, VS Code, Claude Code. Modern, sleek and structured with no blaring colorways and with subtle, smoothing typography."

If a real RequireX codebase or Figma later exists, treat this system as a reference to be **reconciled with**, not as canon.

---

## Index

| File / folder | What it holds |
|---|---|
| `README.md` | This document — context, fundamentals, iconography. |
| `SKILL.md` | Agent‑skill manifest so this folder is portable to Claude Code. |
| `colors_and_type.css` | All design tokens — color, type, spacing, radii, shadow, motion. The single source of truth. |
| `fonts/` | Webfont references (Geist + Geist Mono via Google Fonts). |
| `assets/` | Logo lockups, icon sprite, illustrative marks. |
| `preview/` | Standalone HTML cards rendered in the **Design System** tab. |
| `ui_kits/desktop/` | Pixel recreation of the RequireX desktop app — components + clickable index. |

---

## Content fundamentals

RequireX's voice is **quiet, technical, and precise**. It sounds like the inline help in a well‑written CLI: short, declarative, never cute, never hedged. The product respects the user's time.

### Tone

- **Declarative, not promotional.** "Linked to 3 sources." Not "We've helpfully linked this to 3 sources for you!"
- **Specific, not abstract.** "Couldn't parse line 412 of `spec.pdf`." Not "Something went wrong."
- **Active voice, present tense.** "Extracts running" / "23 requirements extracted" — not "Your requirements have been extracted."
- **No exclamation marks.** Ever, in product. Marketing copy may use one occasionally. The product itself is calm.
- **No emoji in product UI.** Status uses small geometric glyphs (●, ◆, ▲) or icon font. Marketing pages may include emoji sparingly if a user needs it for context.

### Person

- Use **second person ("you")** in marketing and onboarding only.
- In‑app strings are **impersonal** wherever possible — describe the thing, not the user. "3 unresolved" beats "You have 3 unresolved."
- Never use "we" inside the product. The product is not a person.

### Casing

- **Sentence case for everything.** Buttons, menu items, headings. "New requirement", not "New Requirement".
- **Title case is reserved for proper nouns and product names** (RequireX, GitHub, ISO 26262).
- **All caps** is reserved for tiny eyebrow labels (`SOURCE`, `STATUS`, `TRACE`) at 10–11px tracked +0.06em. Never for body or buttons.

### Numbers, IDs, code

- IDs are monospaced (`REQ-0142`, `SRC-04`).
- Counts are bare integers, no thousand separators below 10,000. Above that, comma separators.
- Time uses relative phrasing ("2m ago", "yesterday") with hover tooltip for absolute timestamp.
- File paths and code spans always render in mono with subtle background tint.

### Examples

| Don't | Do |
|---|---|
| "Awesome! Your spec is ready 🎉" | "Spec compiled. 23 requirements." |
| "We couldn't find any sources." | "No sources linked." |
| "Click here to add a new requirement" | "New requirement" |
| "Your file has been successfully imported." | "Imported `payments-v2.pdf`." |
| "Oops! Something went wrong." | "Parse failed at line 412 of `spec.pdf`." |

---

## Visual foundations

### Color philosophy

RequireX's surface is a **near‑black warm grey** (`#0d0d0f`) with carefully tuned greys for surface elevation. There is **one accent color** — a muted amber (`#cb9b6f`) — used sparingly: focus rings, primary CTAs, the active line indicator. Semantic colors (success / warning / danger / info) are dialed back to mid‑saturation: a sage, a soft amber, a warm terracotta, a slate blue. The whole palette can sit beside a long block of code without competing with syntax highlighting.

A light theme exists and is faithful to the dark theme's tonal logic — same hue family, inverted lightness. Both are first‑class.

No gradients in product UI, ever. Marketing pages may use a single subtle radial atmosphere behind the hero, nothing more.

### Type

- **Sans:** Geist (display, UI). 14/20 default body, tight tracking on display sizes (`-0.02em` at 32px+).
- **Mono:** Geist Mono (IDs, code, requirement keys, paths, numbers in tables).
- **Serif:** none. The product is mono + sans.
- **Hierarchy is built with weight + size**, not color or decoration. Section headers are 13px uppercase tracked, never bold.

### Spacing

- Base unit **4px**. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 56, 80.
- Panels prefer **density** over breathing room — VS Code densities. Body type 14px, list rows 28–32px tall.
- Marketing surfaces may use 8px base and double the inter‑section spacing.

### Backgrounds

- Solid surfaces. No images, no patterns, no full‑bleed photography in the product.
- Marketing: matte off‑white (`#f6f5f1`) on light, near‑black on dark, with a single faint **dot grid** (1px dots, `oklch(0% 0 0 / 0.04)`, 24px lattice) when the page needs texture.
- Hand‑drawn illustration is not part of the brand.

### Animation

- Default duration **120ms**, with a 200ms variant for panels.
- Easing **`cubic-bezier(0.2, 0, 0, 1)`** (a quiet ease‑out). No bounce. No spring overshoot.
- Hover transitions on text are 80ms — fast enough to feel like a desktop app.
- Modal and panel reveals fade + 4px translate, never scale.

### Hover & press

- **Hover:** background lifts to the next surface step (`surface‑1` → `surface‑2`). Text never changes color on hover except on links.
- **Press:** background drops one step back, no scale, no shadow change. (IDEs do not "boop".)
- **Focus:** 1.5px outer ring in accent at 60% opacity, 2px offset. Keyboard‑only — never on click.

### Borders

- 1px hairlines, **never** 2px, **never** 0.5px sub‑pixel. Borders use `border-1` token (`#1f1f23` dark, `#e6e4dd` light).
- Most surfaces sit on **borders only** — no shadows. This is what makes the system feel like an IDE rather than a card‑based webapp.

### Shadows / elevation

- Three levels: `e1` (popovers, hover cards), `e2` (menus, command palette), `e3` (modals).
- All shadows are **dark, low‑opacity, vertically dominant**, with a 1px hairline overlay so they read crisply on any background. No glowing colored shadows.

### Transparency & blur

- Used sparingly: command palette backdrop (12px blur, surface at 70%), and hover scrim on focus mode.
- Never on permanent UI chrome.

### Corner radii

- **`r-2` (4px) for inline controls and chips.**
- **`r-3` (6px) for buttons and inputs.**
- **`r-4` (8px) for cards, popovers, and modals.**
- 0 (sharp) for table cells and the editor gutter.
- No fully rounded pills except for status dots and the avatar.

### Cards & containers

- Panel: 1px border + surface‑1, no shadow, `r-4`.
- Popover: 1px border + surface‑2, e2 shadow, `r-4`.
- Inline list row: no border, hover lifts to surface‑1, no radius.

### Layout rules

- The shell is a fixed three‑pane grid (sidebar / main / inspector). The sidebar collapses; the inspector toggles.
- Headers and footers are 32–36px tall — never the marketing‑style 64–72px nav.
- The bottom status bar is 22px and **mandatory** in the app shell, just like VS Code.

---

## Iconography

RequireX uses **Lucide** (`lucide.dev`) at **1.5px stroke weight, 16px** in the product, **20px** in marketing. Lucide is loaded from CDN; no icons are stored locally yet. See `ICONOGRAPHY` notes below.

- **No emoji in product.** A single dot glyph (`●`) carries status color when an icon would be too heavy.
- **No color icons.** Icons inherit current text color (`fg‑2` by default, `fg‑1` on hover or active).
- **No filled variants** of stroke icons in the same view. Pick a register and stay in it.
- **Sizes used:** 12 (status indicators), 14 (inline controls), 16 (sidebar / toolbar / buttons), 20 (marketing, empty states), 24 (dialog headers).
- **Custom marks** — only the RequireX logo and the four "source‑kind" glyphs (PDF, transcript, ticket, code) live in `assets/`.

> ⚠️ **Substitution flag:** Lucide is being used as a stand‑in for RequireX's eventual proprietary icon set. When real icons exist, swap the CDN reference for a local sprite and update `colors_and_type.css` `--icon-stroke` if needed.

---

## Fonts substitution flag

> ⚠️ **Substitution flag:** This system uses **Geist** and **Geist Mono** from Google Fonts. If the RequireX team has licensed display fonts (e.g. ABC Diatype, Söhne, Berkeley Mono), drop the `.woff2` files into `fonts/` and update the `@font-face` references in `colors_and_type.css`.
