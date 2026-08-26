# Rules and guidances for Agents

## Always ask with the `question` tool

Whenever a decision, confirmation, or clarification from the user is needed, use the opencode `question` tool — never rely on free-text prompts. Ask one question at a time.

## Read the README first, then the AGENTS.md

Each directory may contain a `README.md` that explains its content and is an easy-to-read way to discover the project's natyral organization for _humans and AI coding agents_ alike. For more technical workflows (skills and tools) a separate `AGENTS.md` can be found aside (not mandatory).
Always read the `README.md` first before making any change inside a directory.

If decisions change the way things are done inside a project area, always ensure that the `README.md` and its sibling `AGENTS.md` files contains the latest informations, rules and conventions. Always use _english_ as the documentation language even if your session was in another language the user used.

## Always use Bun toolset instead of the equivalent node.js tools or Vite

Use the `use-bun` skill to _always default to using [Bun](https://bun.sh/) instead of any recommanded node.js toolkit_ (`npm`, `pnpm`, `yarn`, `vite`, `vitest`, etc..).
Specifically use the skill when asked to do tasks like : install packages, create tests, launch a js/ts server, build the application : 

- Use `bun <file>` instead of `node <file>` or `vite <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads `.env` files, so don't use dotenv.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Debug artifacts stay inside the project

- Never use `/tmp/` (or any path outside the repository) to capture debug logs,
  screenshots, page dumps, or any other debug artifact.
- Always write them to `tmp/` at the project root so the user can inspect them
  quickly. Keep `tmp/` excluded from git (it is git-ignored).
- When a debug session ends and its fixes are committed, clear `tmp/`:
  `rm -rf tmp/*`

## Project context

The product is a mobile-first PWA (see root `README.md` for vision, stack, and glossary).
Key constraints for all agents:

- Local-first: no backend and no authentication. All quest data is stored in `localStorage`.
- The AI agent uses the Vercel AI SDK. Keep agent calls isolated in a dedicated module.
- UI components are Radix primitives re-exposed as our own styled library.
- Navigation uses React Router.
- Use phone capabilities where available: camera (find photos) and geolocation (next shops to visit).
- The `./prototype/` directory is the reference for screens, flows, data model, and visual style.
  Do not modify it; port its patterns into `./src/`.

## Design System

Use the `design-system-tokens` skill for any UI styling work. The Design System is a dual-file
contract: root `DESIGN.md` (token values + component rules) and `src/styles/theme.css`
(all tokens as CSS variables). Rules:

- Style components with pure CSS files only. No Tailwind in `./src/`.
- Never write raw color literals inside `src/styles/components/*`; use `var()` token references only.
- Component states use the derived `-muted` / `-active` variants from `src/styles/color-variants.css`.
- Re-expose Radix primitives under `src/components/ui/`, one stylesheet per component.


