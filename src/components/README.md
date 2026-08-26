# `src/components/` — Directory Structure

Components are organized following **Atomic Design principles**, split into
tiers by scope and reusability. When creating a component, always ask:
**"where does this component belong to?"** — the tiers below answer that.

```
src/components/
├── README.md          ← this file: tier map and placement rules
├── AGENTS.md          ← coding rules for all components
├── utils/             ← shared TS utilities/props usable by any tier
│                        (spacing.ts, tag.ts — colocated tests)
├── layout/            ← ATOMS: app-agnostic structural primitives
│   │                     (VStack, HStack, Grid; stack glue in layout/utils/)
│   └── utils/
├── ui/                ← MOLECULES: every reusable styled control — Radix-backed
│                         (Dialog, Select…) as well as advanced HTML composites
│                         with ARIA wiring (Button, TextField, Card…)
├── app/               ← ORGANISMS/MOLECULES specific to this app: compositions
│                         of atoms+molecules implementing product concepts
│                         (PageLayout/PageHeader/PageBody/PageFooter)
└── pages/             ← routed screens; not a component tier — composition only
```

## Placement decision table

| You are creating… | Put it in | Examples |
|---|---|---|
| A structural container with no product meaning | `layout/` | VStack, HStack, Grid |
| A reusable styled control or behavior primitive (ARIA, states, Radix) | `ui/` | Button, TextField, Card, Dialog, Select |
| A composition expressing a *product* concept | `app/` | PageLayout, DealCard list shell |
| A full routed screen | `pages/` | QuestScreen |

Rules:

- **There is no `base/` tier.** Pure HTML elements are never redeclared:
  use the native tags directly, and if the styling is structural put it in
  `layout/`. Anything with real behavior (ARIA wiring, variants, states) is
  already a molecule → `ui/`.
- **Never place product-specific components in `layout/` or `ui/`.**
  A component named after a product concept (`Page*`, `Deal*`, `Quest*`)
  belongs to `app/`.
- Lower tiers must never import from higher tiers. Dependency direction:
  `layout ← ui ← app ← pages`.
- Shared prop/type modules used by several tiers live in `components/utils/`;
  module-private helpers stay next to their component in `<tier>/utils/`.
- Tests are always colocated next to their source (one test file per source).
