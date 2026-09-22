# Design: Estudia App Shell + Dashboard

## Technical Approach

Testable `AppHeader` (sticky top nav + mobile bottom nav); `/` a read-only dashboard aggregating bounded reads of existing repos; task page (load + actions) moves verbatim to `/tareas`. No new deps; additive tokens; Spanish UI.

## Architecture Decisions

| # | Choice | Alternatives | Rationale |
|---|--------|--------------|-----------|
| D1 | New `AppHeader.svelte`; layout renders it + `<main>`; login exclusion stays | Nav inline in layout | Thin layout; header testable directly |
| D2 | `NAV_ITEMS` const in AppHeader: `{ href, label, icon }`, inline SVG, `resolve()` hrefs | Icon lib; shared nav module | No new deps (proposal); `resolve()` is the lint rule |
| D3 | Active = exact `page.url.pathname === href` → `aria-current="page"` + accent indicator (border desktop, filled mobile) | `startsWith` prefix | `/` must not highlight everywhere; `/study/*` can adopt prefix later |
| D4 | Tareas del día reuses `listTasks(25)` + `materializeStale`, filters `next_due === today && !done` in component | New `listTasksDueOn` query | No data-layer changes (proposal); bounded truncation is the established contract; keeps `++` cursors consistent |
| D5 | `ObjectiveGrid` gains `compact` prop; `MiniCalendarCard` wraps it | Duplicate grid component | Reuses tested grid semantics (no `role="grid"`, `<time datetime>`, `aria-current`) |
| D6 | Vencimientos reuses `listObjectives(25)`; card splits overdue (top, "Urgente" text) / upcoming in memory | New query | Mirrors ObjectiveList 1-query split; non-color cue |
| D7 | Additive tokens: tint pairs (amber, violet); blue reuses `--color-accent-soft`; urgent reuses `--color-overdue-*` | New urgent token; color-mix | Smallest surface; overdue bg/text convention; AA in apply |
| D8 | `/tareas/+page.server.ts` = root load + actions moved verbatim; root load-only | Shared action helper | Actions are route-bound; verbatim move = zero behavior change |
| D9 | Nav `aria-label`; compact chips carry visually-hidden status; global `:focus-visible`; reduced motion via existing override | — | app-shell/dashboard a11y requirements |

## Data Flow

```
+page.server.ts (/)                        /tareas (moved verbatim)
  listTasks(25) ─► materializeStale ─► tasks             listTasks(25)+materializeStale
  listMonth(start,end) (200) ─────────► month            +historyForTasks + actions
  listObjectives(today) (25) ─────────► list
        │ today (ART)
        ▼ props
  GreetingHeader ◄ today (+hour)
  TasksTodayCard ◄ tasks, today           → today's pending
  MiniCalendarCard ◄ month, today, monthKey=today.slice(0,7) → ObjectiveGrid compact
  UpcomingDeadlinesCard ◄ list, today     → overdue | upcoming
  SubjectsCard ◄ static                   → /study
```

Reads bounded; only write is the existing idempotent `materializeStale`. Each page sets a Spanish `<title>`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/components/AppHeader.svelte` | Create | Brand → `/`; 5-nav top + fixed bottom; logout; active state (D3) |
| `src/lib/components/dashboard/DashboardCard.svelte` | Create | Card shell (title, footer link, snippet) |
| `src/lib/components/dashboard/GreetingHeader.svelte` | Create | `{ today, hour? }`; Spanish long date + greeting |
| `src/lib/components/dashboard/TasksTodayCard.svelte` | Create | `{ tasks, today }`; read-only rows, "Ver todas", empty state |
| `src/lib/components/dashboard/MiniCalendarCard.svelte` | Create | `{ month, today, monthKey }`; heading + compact grid + link |
| `src/lib/components/dashboard/UpcomingDeadlinesCard.svelte` | Create | `{ list, today }`; overdue "Urgente" + upcoming, bounded 25 |
| `src/lib/components/dashboard/SubjectsCard.svelte` | Create | Static Materias cards → `/study`; tints |
| `src/routes/+layout.svelte` | Modify | `<AppHeader />`; mobile bottom padding |
| `src/routes/+page.svelte` | Modify | Dashboard 12-col grid; stacks on narrow |
| `src/routes/+page.server.ts` | Modify | Dashboard load only; actions removed |
| `src/routes/tareas/+page.svelte` | Create | TaskList + TaskForm reuse |
| `src/routes/tareas/+page.server.ts` | Create | Root load + actions verbatim |
| `src/lib/components/ObjectiveGrid.svelte` | Modify | `compact` prop; chips with visually-hidden status |
| `src/lib/styles/tokens.css` | Modify | Additive tint pairs (D7) |
| `src/lib/components/shell.test.ts` | Modify | 5 links + Materias, logout, active state |
| `src/routes/page.test.ts` | Modify | Assert dashboard |
| `src/routes/tareas/page.test.ts` | Create | Task page at `/tareas` |
| `src/lib/components/dashboard/*.test.ts` | Create | Card tests |
| `src/lib/components/objectives.test.ts` | Modify | Compact-grid cases |

## Interfaces / Contracts

- `AppHeader`: no props (reads `$app/state`).
- `TasksTodayCard`: `{ tasks: TaskWithDone[]; today: string }` — filters, never mutates.
- `MiniCalendarCard`/`UpcomingDeadlinesCard`/`ObjectiveGrid(compact)`: `{ month|list: ObjectiveRow[]; today; monthKey? }`.
- Nav hrefs via `resolve()`: `/`, `/tareas`, `/calendar`, `/study`, `/documents`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Component | AppHeader links/active/logout; cards (today-filter, "Urgente" split, compact status, subjects) | vitest + @testing-library/svelte; mirrors objectives.test.ts; shell.test.ts extended |
| Route | `/` dashboard; `/tareas` task list | page.test.ts + tareas/page.test.ts |
| Integration | Actions unchanged at `/tareas` | existing workers tests + CI (lint, vitest, build) |

## Threat Matrix

`N/A` for all rows — SvelteKit app routes only; no shell, subprocess, VCS/PR, executable-file, or git boundary (auth gate in `hooks.server.ts` untouched, covers `/tareas`).

## Migration / Rollout

No migration; data layer untouched. Rollback = revert PR.

## Open Questions

- [ ] Greeting by hour, no user name — confirm.