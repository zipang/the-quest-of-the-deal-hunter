# React Component Rules — `src/components/`

These rules apply to every React component under `src/components/`.
Read [`../AGENTS.md`](../AGENTS.md) first for the TypeScript rules.
They are not repeated here.

## 1. Pick the folder before you write

Component folders follow the [Atomic Design Principles](./README.md).
In one sentence: small generic pieces live low
(`layout/`, `base/`, `ui/`), product pieces live high (`app/`, `pages/`).

To choose a folder, ask **what the component is**, not where it is used:

- A structural container with no product meaning → `layout/`
- Text content → `base/` (see §2)
- A reusable styled control (ARIA, variants, states, Radix) → `ui/`
- A composition that expresses a product concept → `app/`
- A routed screen → `pages/`

A component named after a product concept (`Page*`, `Deal*`, `Quest*`) never
goes into `layout/` or `ui/`. Imports flow downward only:
`pages → app → ui/base → layout`.

## 2. Typography goes through `base/`

Do not use raw text tags (`h1`–`h6`, `p`). Use `base/Heading` and
`base/Text`. This is how the Design System typography is enforced.
No other HTML element gets redeclared in `base/`.

## 3. Layout goes through `layout/` — raw `div`/`span` for layout is FORBIDDEN

Every layout and every structural container MUST come from the UI kit
in `src/components`. Direct use of `<div>` or `<span>` for layout,
spacing, stacking, or alignment outside the kit is **forbidden**.
This is how the Design System stays conformant — tokens flow through
props, not through ad-hoc CSS or inline styles.

- **Use `layout/VStack`, `layout/HStack`, `layout/Grid` exclusively**
  for stacking, grouping, centering, and spacing in `pages/` and
  `app/`. Never introduce a `<div className="...">` or
  `<span style={...}>` to lay out children.
- **No hard styling on raw elements.** Do not apply `className`,
  `style`, `flex`, `gap`, `margin`, or `padding` to a raw `div`/`span`
  to mimic a stack or grid. Use the layout props instead:
  `gap`, `padding`, `margin`, `stackItems`, `alignItems`, `wrap`,
  `inline`, `as`.
- **Allowed exceptions are narrow and documented:**
  1. Inside the implementation of the primitives themselves
     (`layout/VStack.tsx`, `layout/HStack.tsx`, `layout/Grid.tsx` and
     `layout/utils/*`) a raw element is rendered via the `as` prop.
  2. Inside `ui/` when a Radix primitive or semantic element
     (`article`, `section`, `nav`, `button`) is required and no layout
     primitive can express it — add a one-line comment explaining why
     the raw element is necessary.
  3. Raw `div`/`span` is never allowed in `pages/` or `app/` for layout.
- **Enforcement:** a review must reject any PR that introduces a raw
  `div`/`span` for layout in `pages/` or `app/`. Prefer the smallest
  layout primitive that fits:

```tsx
// ❌ FORBIDDEN — breaks Design System conformance
<div className="start-quest-quest" style={{ display: "flex", gap: "16px" }}>
  <SpriteAnimation ... />
  <Text>NO QUEST ITEM ADDED</Text>
</div>

// ✅ REQUIRED — tokens via props, no raw div
import { VStack } from "@components/layout/VStack";

<VStack gap="lg" alignItems="center" className="start-quest-quest">
  <SpriteAnimation ... />
  <Text>NO QUEST ITEM ADDED</Text>
</VStack>
```

Before styling any layout, read the `design-system-tokens` skill:
spacing, gap, and alignment values must come from the token props,
never from literals.

## 4. Components are APIs

- One props interface per component, named `<Component>Props`.
- Type the component as `React.FC<Props>` and destructure props in the signature.
- Document every prop with JSDoc. Give every optional prop a sensible default value.

```tsx
import type { FC } from react;

import style from "./DealCard.css"

export interface DealCardProps {
  /** The deal displayed by the card. */
  deal: Deal;
  /** 
   * Visual emphasis of the card. 
   * @default "normal" 
   */
  variant?: "normal" | "highlighted";
}

/** 
 * Renders one deal as a tappable card. Used inside quest lists. 
 */
export const DealCard: React.FC<DealCardProps> = ({ deal, variant = "normal" }) => (
  <article className="deal-card">{/* ... */}</article>
);
```

## 5. Files and tests

- One component per file. The file name matches the component name
  (`DealCard.tsx` exports `DealCard`).
- One stylesheet per component. The stylesheet import is the last import.
- One colocated test file per source file (`VStack.tsx` → `VStack.test.tsx`).
- Every test asserts observable behavior (tag, class, prop wiring).
  Tests that only restate types or constants add noise, not safety.
- Import Radix primitives only through `src/components/ui/`. Feature
  components never import from `@radix-ui/*` directly.
- Reusable custom hooks live in `src/hooks/`, one hook per file,
  named `useThing.ts`.

## 6. Styling

Before any styling work, read the `design-system-tokens` skill.

- Pure CSS files only. No Tailwind. No inline style objects except truly
  dynamic values.
- No hardcoded literals for colors, spacing, border, elevation: use the CSS variables 
  from `src/styles/theme.css`.
- Scope the CSS rules within a unique classname that repeats the component's name in kebab-case: 
  `DealCard` => `.deal-card {}`.
- Style all the various state of a component with class names repeating the name of the state 
  (e.g. `active` / `disabled`..)
- Use the derived `-muted` / `-active` color variants from `src/styles/color-variants.css` 
  for states like `disabled` / `active`.

## 7. Hooks discipline

- Respect the Rules of Hooks.
- Do not add `useMemo` / `useCallback` without a measured need.
  Comment why when you use them.
- Never store derived values in state; compute them during render.
- Keep state close to where it is used. Lift it only when shared.
- `useEffect` synchronizes with external systems. It never derives render output.

## 8. Mobile-first and local-first

- Design every screen for a phone viewport first. Test at small widths first.
- Access device capabilities (camera, geolocation) through their dedicated modules.
