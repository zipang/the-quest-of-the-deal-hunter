# Rules and guidances for Agents — `roadmap/`

## What lives here

One directory per **Ticket** (`T0001`–`T9999`), containing the planning
artifacts of a single feature or significant change. See the Glossary entry
**Ticket** in the root `README.md` and `roadmap/README.md` for the layout.

## Creating a Ticket

Do not invent a directory by hand. Use the skills, which allocate the next
sequential ID by scanning this directory for existing `T\d{4}` names:

- `spec-driven-development` — creates the ticket, writes `spec.md` (then
  `plan.md` and `todo.md` in its later phases).
- `planning-and-task-breakdown` — writes `plan.md` and `todo.md` into an
  existing (or newly allocated) ticket directory.

## Implementing a Ticket

Follow the `/implement` command: it resolves the Ticket from the arguments
(ID or feature-name match), loads `spec.md` / `plan.md` / `todo.md` as
context, and works through `todo.md` in thin vertical slices. Check off
tasks in `todo.md` as they complete.

## Conventions

- Never renumber or recycle Ticket IDs, even if a ticket is abandoned.
- Keep all cross-references pointing inside the ticket's own directory
  (e.g. `roadmap/T0006/spec.md`), never to shared files.
- When a ticket's status changes, update the index table in
  `roadmap/README.md`.
- Superseded specs stay in place; note the superseding ticket inside them
  (see `roadmap/T0005/spec.md` for an example).
