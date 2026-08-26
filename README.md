# THE QUEST OF THE DEAL HUNTER

The Quest of the Deal Hunter is a mobile-first PWA that turns deal hunting into a game.
A user composes a daily quest (items wanted, category, budget). An AI agent then recommends
famous specialized areas and shops, reachable on foot or by public transport
(for example: Akihabara for anime goods, Nishi-Shinjuku for used cameras).
During the hunt the user logs visited shops and found items, with price and condition.
After the hunt, a review screen compares all finds per item and shows the best deal.

## Vision

- Single user. No authentication. All data lives in the browser `localStorage`.
- The app uses phone capabilities:
  - Camera: take pictures of shops and items found.
  - Geolocation: sort and present the next shops to visit on the hunting page.
- Shop recommendations come from an AI agent built with the Vercel AI SDK,
  backed by web knowledge and Google Places.

## Core user flow

1. Setup: add one or more quest targets (name, description, category, budget).
2. Quest start: the agent recommends an optimized list of areas/shops for the categories.
3. Hunt: visit shops in order of proximity, scan for items, log finds.
4. Review: compare finds by price and condition, mark the best deal, decide to buy.

## Tech stack

| Concern         | Choice                                             |
| --------------- | -------------------------------------------------- |
| Runtime / tools | Bun (install, run, test, build)                    |
| Framework       | React 19                                           |
| UI components   | Radix UI, re-exposed as our own styled design system |
| Navigation      | React Router                                       |
| AI agent        | Vercel AI SDK (+ Google Places data)               |
| Persistence     | `localStorage`, local-first, no backend            |
| Lint / format   | Biome                                              |

## Design System

The Design System is a dual-file contract:

- `DESIGN.md` — token values (YAML front matter) plus rules to build every component.
- `src/styles/theme.css` — the same tokens as CSS variables in one `:root` block, followed by
  `src/styles/color-variants.css` (derived muted/active states) and `src/styles/reset.css`.

Components are Radix primitives re-exposed under `src/components/ui/`, each styled by a pure
CSS file under `src/styles/components/`. The visual identity is retro arcade, ported from
the prototype. See the `design-system-tokens` skill in `.agents/skills/`.


## Prototype

Inside the `./prototype/` directory is a quick Figma Make prototype used for reference.
It contains a couple of things that we replicate:

* React + Radix UI: we keep Radix UI as the unstyled UI component library because it has good ARIA practices. We re-expose every Radix UI component as our own library, styled with our Design System.
* React Router for navigation.
* The data structure between shops, categories, and quest items.
* The full hunt loop: setup → add-item → quest → shop → item-select → found-log → review.
* The retro arcade visual style: dark background, neon accents, pixel-art sprites, CRT effects.

## Glossary

- **Quest**: A daily shopping session composed of one or more **Quest Items** that the user wants to find, and an ordered list of **Shops** to visit.
- **Quest Item**: An item the user hunts during a quest. It has a name, an optional description, a **Category**, and a maximum budget.
- **Shop**: A real shop recommended by the agent or logged by the user. It belongs to an area and matches one or more categories.
- **Find**: An observed occurrence of a quest item inside a shop. Logged with price, condition, notes, and optionally a photo.
- **Category**: A type of collectible goods (for example figurines, cameras, vintage, electronics). Categories drive shop recommendations.
- **Condition**: Quality grade of a find: MINT, GOOD, FAIR, or POOR.
- **Hunt**: The phase where the user visits shops from the recommended list and logs finds.
- **Area**: A district famous for gathering many shops of one category (example: Akihabara).
