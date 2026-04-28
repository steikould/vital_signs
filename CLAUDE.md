# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A collection of **static HTML screen mockups** for the BTO Intelligence dashboard — a "Bloomberg-terminal-meets-Financial-Times" enterprise analytics product. There is no build system, no package manager, no tests, and no shared component layer. Each screen is a single self-contained `code.html` file rendered by opening it directly in a browser; Tailwind is loaded from the CDN at runtime (`cdn.tailwindcss.com?plugins=forms,container-queries`).

## Repository layout

- [DESIGN.md](DESIGN.md) — canonical design system spec (color tokens, typography, components, layout rules). The YAML frontmatter is the source of truth for design tokens.
- [navigation_architecture_ux_logic.md](navigation_architecture_ux_logic.md) — defines the **Matrix Navigation** model: a vertical sidebar (Domains: PORTFOLIO / STRATEGY / RISK / INITIATIVES) crossed with a horizontal top bar (Lenses: Summary → Diagnostics → Gap Analysis → Reports). All screens must respect this structure.
- `<feature>_<context>/` directories — one per screen mockup. Each contains:
  - `code.html` — the screen
  - `screen.png` — reference render
- [portfolio_intelligence_editorial/](portfolio_intelligence_editorial/) is the exception: doc-only (its `DESIGN.md` is a duplicate of the root one) — keep them in sync.

## Architecture: things that aren't obvious from reading one file

### 1. The design system lives in three places and must be edited in all of them
Tokens defined in [DESIGN.md](DESIGN.md) are duplicated as an inline `tailwind.config` `<script>` block at the top of **every** `code.html`. There is no shared config file. When you change a token (color, font size, spacing), you must update:
1. The YAML frontmatter in [DESIGN.md](DESIGN.md) (and the duplicate in [portfolio_intelligence_editorial/DESIGN.md](portfolio_intelligence_editorial/DESIGN.md)).
2. The `tailwind.config` block in **every** `code.html` that uses the token.
3. Any literal hex values matching the old token (see below).

### 2. Two parallel color vocabularies coexist
The codebase mixes two systems and you have to recognize which one a given element uses:
- **Material-style tokens** in the Tailwind config (`surface`, `primary`, `on-surface-variant`, `tertiary-container`, etc.) — sourced from [DESIGN.md](DESIGN.md) frontmatter, used as `bg-surface`, `text-on-surface`, etc.
- **"Terminal" hardcoded hex literals** — applied via arbitrary-value Tailwind classes like `bg-[#0E1116]`, `border-[#2A2F3A]`, `text-[#D4A155]`. These come from the "Elevation & Depth" section of [DESIGN.md](DESIGN.md) and do **not** have token aliases. Key values:
  - `#0E1116` — global background (Level 0)
  - `#161A22` — surface / cards / sidebar (Level 1)
  - `#2A2F3A` — 1px hairline divider (the only separator allowed; shadows are forbidden)
  - `#D4A155` — Precise Amber accent (focus/active/critical only)
  - `#E8E6E1` — primary text
  - `#8B8F99` — muted text / inactive nav

### 3. Strict visual rules (from [DESIGN.md](DESIGN.md)) that must not be relaxed
- **Sharp 0px corners everywhere** — no `rounded-*` classes on UI elements. The Tailwind config keeps a `borderRadius` scale only for incidental cases (e.g., avatars use `rounded-full`).
- **No shadows.** Elevation is communicated through tonal layering (#0E1116 → #161A22) and 1px `#2A2F3A` hairline borders only.
- **Tabular figures (`tnum`) on all dashboard numbers** for column alignment.
- **Serif (Newsreader) = Story/Insight** (headings, large quantitative totals). **Sans (Inter Tight) = Interface/Action** (UI, nav, table cells). Don't cross the streams.
- **Metadata labels** use the `metadata-label` token (11px, 600 weight, 0.1em letter-spacing, uppercase) and sit *above* their fields, never inline.

### 4. Shared shell, copy-pasted
Every screen renders the same fixed left sidebar (5 domain links + user chip) and top app bar (product title + 4-lens nav + search/notifications/export). These are duplicated by hand across files — there is no template. When updating shell markup, propagate to every `code.html`. Active nav state is indicated by `text-[#D4A155]` plus a `border-l-2 border-[#D4A155]` strip on sidebar items, or a `border-b border-[#D4A155]` underline on top-bar lenses.

## Working with the screens

There are no commands to run. To view a screen, open its `code.html` in a browser:

```bash
start demand_prioritization_bto_intelligence/code.html   # Windows
```

The pages depend on network access for `cdn.tailwindcss.com`, Google Fonts (Inter Tight, Newsreader), and Material Symbols Outlined — they will not render correctly offline.
