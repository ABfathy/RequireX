---
name: requirex-design
description: Use this skill to generate well-branded interfaces and assets for RequireX, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

RequireX is a desktop-class requirements-engineering tool. The aesthetic is **VS Code / Claude Code / Linear** — quiet, dense, technical. There is one accent (muted amber). There are no gradients, no emoji, no marketing gloss inside the product. Hierarchy is built with weight + size, not color.

Important rules to remember while generating any artifact for RequireX:

1. **Always import `colors_and_type.css`** — never hard-code values. Tokens cover color, type, spacing, radii, elevation, motion.
2. **Default to dark theme.** Light theme exists and is faithful; both are first-class.
3. **Type is Geist + Geist Mono.** Monospace is used for IDs (`REQ-0142`), file paths, code, and tabular numerics.
4. **Sentence case everywhere.** No exclamation marks. No emoji in product UI.
5. **One accent.** Amber `#cb9b6f`. Use it for focus rings, primary CTA, the active line indicator, and selected source rails. Nothing else.
6. **Borders, not shadows.** Most UI sits on 1px hairlines. Reserve `e1`/`e2`/`e3` shadows for popover, menu, modal.
7. **Lucide icons** at 1.5px stroke. Inline as React components (`ui_kits/desktop/icons.jsx`) or via CDN — never hand-roll new SVGs unless extending `assets/`.
8. **Density.** 28–32px row height. 13–14px body type. Status bar is mandatory in app shells.
9. **No filler content** — every element should earn its place.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of this folder and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick start

```html
<link rel="stylesheet" href="colors_and_type.css"/>
<body class="...">
  <!-- use tokens: var(--bg-app), var(--fg-1), var(--accent), --t-md, --r-3, etc. -->
</body>
```

For a working three-pane shell, copy `ui_kits/desktop/` wholesale and replace the mocked data in `Sidebar.jsx`, `Editor.jsx`, `Inspector.jsx`.
