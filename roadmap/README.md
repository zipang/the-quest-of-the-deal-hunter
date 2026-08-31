# Roadmap

This directory holds **Tickets** — isolated units of planned work (features or
significant changes), each in its own directory identified by a sequential
Ticket ID from `T0001` to `T9999`.

Tickets may exist here long before they are implemented: the roadmap is a
place to prepare future work, not a record of completed work only.

## Ticket layout

```
roadmap/
└── TXXXX/
    ├── spec.md   ← requirements & acceptance criteria (spec-driven-development)
    ├── plan.md   ← implementation plan & task ordering (planning-and-task-breakdown)
    └── todo.md   ← checklist-style task list, checked off during implementation
```

Each file exists only once it has been produced: a brand-new ticket may
contain only `spec.md`.

## Tickets status ([x] is done)

- [x] T0001 - Sprite Manager Utility
- [x] T0002 - Card + SelectOption UI components
- [x] T0003 - Form Components
- [x] T0004 - SliderRange 
- [x] T0005 - Sprite Generator tab
- [x] T0006 - Sprite Manager review hardening
- [x] T0007 - Spritesheet generation mode (4×4 / 8×8)

Keep this table updated when creating or completing a Ticket.
