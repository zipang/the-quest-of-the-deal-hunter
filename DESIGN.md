---
colors:
  brand:
    primary: "#FFC800"      # gold — XP, rewards, highlights, logo
    accent: "#00FF9F"       # neon green — CTAs, key accents, focus ring
    secondary: "#00B4D8"    # cyan — links, charts, info surfaces
    # tertiary omitted → --color-brand-tertiary: var(--color-brand-primary)
  action:
    success: "#00FF9F"
    info: "#00B4D8"
    warning: "#FF9500"
    danger: "#FF006E"
  text:
    base: "#E0E0FF"         # pale lavender on dark indigo
    accent: "#00FF9F"
    muted: "#6060A0"
  surface:
    base: "#0A0A18"         # deep indigo night background
    alt: "#151530"          # scanline-banded sections
    card: "#1A1A35"
    dark: "#05050F"
typography:
  base:
    fontFamily: "VT323, monospace"      # body and labels
  display:
    fontFamily: "'Press Start 2P', monospace"
  # mono omitted → --font-family-mono: var(--font-family-base)
  scale:
    xs: "0.75rem"
    sm: "0.875rem"
    base: "1rem"
    lg: "1.333rem"
    xl: "1.777rem"
    display: "2.369rem"     # perfect fourth scale, ratio 1.333
  weights:
    regular: 400
    medium: 600             # arcade labels read as semibold
    bold: 700
spacing:
  xs: "0.25rem"   #  4px
  sm: "0.5rem"    #  8px
  md: "0.75rem"   # 12px
  base: "1rem"    # 16px — step 0
  lg: "1.25rem"   # 20px
  xl: "2rem"      # 32px
  xxl: "3rem"     # 48px
rounded:
  sm: "2px"
  base: "4px"
  lg: "8px"
  full: "9999px"
elevation:
  sm: "none"                                   # flat resting surfaces
  md: "0 0 12px rgba(0, 255, 159, 0.35)"       # neon glow for raised cards
  lg: "0 0 24px rgba(0, 255, 159, 0.55), 0 0 48px rgba(0, 180, 216, 0.25)"  # overlays, modals
border:
  sm: "1px"   # dividers, input borders (rgba neon, see Components)
  md: "2px"   # active selection, quest cards
  lg: "4px"   # pixel-frame emphasis, level-up panels
---

# DESIGN.md — The Quest of the Deal Hunter

This file is the foundation of the Design System. The token values above are mirrored in
`src/styles/theme.css` as CSS variables. Keep both files identical when a value changes.

## Overview

The visual identity is retro arcade: deep indigo night surfaces, neon green, pink and cyan
accents, pixel typography, square corners and glowing borders. The palette was ported from
the Figma Make prototype in `./prototype/`. VT323 covers body text and labels;
"Press Start 2P" covers headings.

## Colors

| Role | Value | Usage |
|---|---|---|
| Brand primary | `#FFC800` | Gold. XP, rewards, best-deal badge, logo |
| Brand accent | `#00FF9F` | Neon green. CTAs, progress, focus rings |
| Brand secondary | `#00B4D8` | Cyan. Links, carousel hints, chart accents |
| Success | `#00FF9F` | Confirmations, found-item rewards |
| Info | `#00B4D8` | Neutral notifications |
| Warning | `#FF9500` | Over-budget warnings |
| Danger | `#FF006E` | Destructive actions, cancel states |
| Text | `#E0E0FF` | Default body text |
| Text accent | `#00FF9F` | Headings inside body flow, highlighted values |
| Text muted | `#6060A0` | Secondary content, disabled items |
| Surface | `#0A0A18` | Page background |
| Surface alt | `#151530` | Alternating sections |
| Surface card | `#1A1A35` | Cards, forms, shops panel |

### Color variants

Brand and action colors carry derived `muted` and `active` variants generated in
`src/styles/color-variants.css`. They are not tokens and do not appear in the front matter.

- muted — softened resting variant: saturation ×0.8, lightness ×1.2.
- active — vivid pressed variant: saturation ×1.2, lightness ×1.1.

Text and surface variants are explicit tokens because they do not derive well from HSL math
on near-dark colors. Use them as defined.

### Borders

Border widths are tokens (`--border-sm/md/lg`). Border colors are not. Choose per component:

- Default edge: `1px solid rgba(0, 255, 159, 0.15)` (15% neon green).
- Active or emphasized edge: `var(--border-md) solid var(--color-brand-accent)`.
- Danger edge: `var(--border-md) solid var(--color-action-danger)`.

## Typography

- Body and labels (`base`) use VT323 at `--font-weight-regular`, line height
  `--line-height-normal`. The mono family falls back to the base family, so prices, timers
  and other monospaced-feeling copy inherit it for free.
- Headings use "Press Start 2P" (display family). Because this face is wide, headings get
  letter spacing `--letter-spacing-normal` and line height `--line-height-tight`.
- Scale follows a perfect fourth ratio (1.333): xs 0.75rem → display 2.369rem.

## Layout

- Mobile-first: design at 430 px viewport width, no fixed desktop layout.
- Screens slide horizontally between routes. Forward enters from the right; back-swipe
  exits to the right with state preserved.
- Spacing rhythm uses the 4 px linear scale. Section padding is `--space-lg`;
  page-level vertical gaps are `--space-xl`.

## Elevation and depth

Arcade style favors glow over realistic shadows:

- Resting cards are flat (`--elevation-sm` = none) and separate via surface colors and 1 px
  neon edges.
- Raised elements (shop cards in view, selected quest item) glow with `--elevation-md`.
- Overlays and modals glow with `--elevation-lg`.
- A CRT scanline overlay sits above every screen; it never blocks pointer events.

## Shapes

Corners stay nearly square (sm 2 px, base 4 px, lg 8 px): rounded elements feel off-brand.
Use `--rounded-full` only for avatars, pills, and circular XP badges.

## Components

Components live in `src/components/ui/` as re-exposed Radix primitives. One stylesheet per
component under `src/styles/components/`. Every value comes from theme variables.

State recipes shared by all interactive components:

- hover: switch color to its `-muted` variant of the same token.
- pressed / active: switch to the `-active` variant.
- disabled: surface `--color-surface-alt`, text `--color-text-muted`, border width
  `--border-sm`, shadow none.
- focus-visible: `var(--border-md) solid var(--color-brand-accent)` plus
  `box-shadow: var(--elevation-md)`.

### Button

- Primary: background `--color-brand-accent`, text `var(--color-surface-dark)`,
  weight `--font-weight-medium`, radius `--rounded-base`, padding `--space-sm --space-md`.
- Gold (reward): background `--color-brand-primary`, text `var(--color-surface-dark)`.
- Danger (exit, cancel): background transparent, border `--border-md`
  `var(--color-action-danger)`, text `--color-action-danger`.
- Sizes change padding only, never font size: sm `--space-xs --space-sm`,
  md default, lg `--space-md --space-lg`.

### Card

Background `--color-surface-card`, radius `--rounded-base`,
border `1px solid rgba(0, 255, 159, 0.15)`. On selection add
`var(--border-md)` accent border and `--elevation-md`.

### Dialog / Sheet

Overlay: `rgb(5 5 15 / 80%)`. Panel: `--color-surface-card`, `--elevation-lg`,
radius `--rounded-lg`.

## Do's and Don'ts

Do:

- Use one name for one thing: token names only.
- Port screen styles from `./prototype/src/app/App.tsx` but map every literal to a token.
- Keep sprite art and CRT effects additive layers, outside component CSS.

Don't:

- Do not write raw hex, hsl or rgba literals in component stylesheets.
- Do not soften corners beyond `--rounded-lg` or add drop shadows from other presets.
- Do not introduce Tailwind into `./src/`; this project styles with pure CSS files.
