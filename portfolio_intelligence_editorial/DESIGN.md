---
name: Portfolio Intelligence Editorial
colors:
  surface: '#17130d'
  surface-dim: '#17130d'
  surface-bright: '#3e3832'
  surface-container-lowest: '#110e09'
  surface-container-low: '#1f1b15'
  surface-container: '#231f19'
  surface-container-high: '#2e2923'
  surface-container-highest: '#39342e'
  on-surface: '#ebe1d8'
  on-surface-variant: '#d3c4b3'
  inverse-surface: '#ebe1d8'
  inverse-on-surface: '#353029'
  outline: '#9c8f7f'
  outline-variant: '#4f4538'
  surface-tint: '#f3bd6e'
  primary: '#f3bd6e'
  on-primary: '#442b00'
  primary-container: '#d4a155'
  on-primary-container: '#573800'
  inverse-primary: '#7f560f'
  secondary: '#c3c6d1'
  on-secondary: '#2c3039'
  secondary-container: '#454952'
  on-secondary-container: '#b5b8c3'
  tertiary: '#9ecafc'
  on-tertiary: '#003256'
  tertiary-container: '#82aede'
  on-tertiary-container: '#06416b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb2'
  primary-fixed-dim: '#f3bd6e'
  on-primary-fixed: '#291800'
  on-primary-fixed-variant: '#624000'
  secondary-fixed: '#dfe2ee'
  secondary-fixed-dim: '#c3c6d1'
  on-secondary-fixed: '#181c24'
  on-secondary-fixed-variant: '#434750'
  tertiary-fixed: '#d0e4ff'
  tertiary-fixed-dim: '#9ecafc'
  on-tertiary-fixed: '#001d34'
  on-tertiary-fixed-variant: '#154974'
  background: '#17130d'
  on-background: '#ebe1d8'
  surface-variant: '#39342e'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1-editorial:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  h2-editorial:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  data-large:
    fontFamily: Newsreader
    fontSize: 36px
    fontWeight: '400'
    lineHeight: '1'
  body-ui:
    fontFamily: Inter Tight
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  body-ui-bold:
    fontFamily: Inter Tight
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.5'
  metadata-label:
    fontFamily: Inter Tight
    fontSize: 11px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  tabular-data:
    fontFamily: Inter Tight
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
spacing:
  unit: 4px
  container-margin: 32px
  gutter: 1px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style

This design system is built for high-stakes enterprise decision-making, blending the authority of a premium financial publication with the clinical precision of a modern Bloomberg terminal. The aesthetic is "Intellectual Minimalist"—it prioritizes information density and clarity over visual flair. 

The system targets C-suite executives and portfolio managers who require a diagnostic environment that feels expensive yet understated. By removing glassmorphism, gradients, and soft corners, the UI evokes a sense of permanence and rigorous objectivity. The brand personality is authoritative, restrained, and meticulously organized.

## Colors

The palette is anchored in a "Refined Dark" scheme. The primary background uses a deep blue-charcoal to reduce eye strain during deep work, while secondary surfaces provide subtle structural depth without relying on shadows.

The accent color—Precise Amber—is reserved strictly for interactive focus, active states, and critical paths. Tier colors (Accelerate through Defer) and Work Nature indicators (AI classification) use desaturated, sophisticated tones to maintain an editorial feel while ensuring categorical distinctness. All semantic colors must pass AA contrast ratios against the secondary surface background.

## Typography

This design system utilizes a dual-typeface strategy to balance editorial elegance with data utility. 

**Newsreader** (the serif choice) is used for high-level headers and significant quantitative totals to provide a "Financial Times" sophistication. **Inter Tight** is the workhorse for UI components, navigation, and granular data, chosen for its narrow apertures and legibility in high-density layouts.

**Technical Constraints:**
- All numbers in dashboards must use `tnum` (tabular figures) to ensure vertical alignment in columns.
- Metadata labels must be rendered in tracked small caps (using the `metadata-label` token) to differentiate them from actionable UI text.
- Maintain a strict hierarchy where Serif = Story/Insight and Sans = Interface/Action.

## Layout & Spacing

The layout philosophy is based on a **Modular Grid System** with a 1px hairline logic. Instead of traditional wide gutters, components are separated by #2A2F3A hairline dividers to maximize information density—akin to a spreadsheet or a terminal.

The layout uses a 12-column fluid grid for dashboard widgets, but internal widget padding is strictly 16px or 24px to maintain an airy editorial feel within a dense framework. Alignment should be rigorous; every element must snap to a 4px baseline grid.

## Elevation & Depth

This design system eschews shadows entirely. Elevation is communicated through **Tonal Layering** and **Structural Outlines**.

1.  **Level 0 (Base):** Deep blue-charcoal (#0E1116) for the global background.
2.  **Level 1 (Surface):** Secondary surface (#161A22) for widgets, cards, and sidebars.
3.  **Level 2 (Active/Hover):** Subtly lighter fill or a 1px border using the Precise Amber (#D4A155).

Separation of concerns is achieved through 1px #2A2F3A dividers rather than depth effects. This creates a "flat-stack" appearance where the hierarchy is determined by the arrangement on the grid, not the perceived distance from the screen.

## Shapes

The shape language is strictly **Sharp (0px)**. 

Every UI element, from primary buttons to status tags and container cards, uses 90-degree corners. This reinforces the clinical, diagnostic aesthetic and ensures that the 1px hairline dividers meet at precise intersections. Softness is avoided to maintain the system's authoritative and structural tone.

## Components

**Buttons:**
- **Primary:** Solid #D4A155 with #0E1116 text. Sharp corners.
- **Secondary:** 1px hairline border #2A2F3A with #E8E6E1 text. No background fill.
- **Ghost:** No border, #8B8F99 text, shifts to #E8E6E1 on hover.

**Status Chips (Tier/Nature):**
- Sharp-edged rectangles. 
- Background: Desaturated tier color at 15% opacity.
- Border: 1px left-hand accent strip (2px width) of the full-intensity tier color.
- Text: Full-intensity tier color, small caps.

**Inputs & Fields:**
- Background: #0E1116.
- Border: 1px hairline #2A2F3A.
- Focus: 1px border #D4A155.
- Labels: Use `metadata-label` token, positioned strictly above the field.

**Data Tables:**
- No row stripping. Use 1px #2A2F3A horizontal dividers only.
- Column headers use `metadata-label`.
- Data cells use `tabular-data` for alignment.

**Dashboards Widgets:**
- Flat containers with #161A22 background.
- Header section separated by a 1px divider.
- Editorial titles in Serif, supporting text in Sans.