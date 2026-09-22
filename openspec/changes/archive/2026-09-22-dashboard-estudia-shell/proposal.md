# Proposal: Estudia App Shell + Dashboard

## Intent

Replace the bare header + task-list home with an Estudia-style app shell and a `/` dashboard aggregating the existing tasks and objectives features (Reference 1 in `docs/design-reference.md`). `/` becomes the dashboard; the task list moves to `/tareas`. No data-layer changes: the dashboard consumes existing repositories and server loads.

## Scope

### In Scope

- Sticky header: brand, nav (Inicio, Tareas, Calendario, Materias, Documentos), desktop top nav + mobile bottom nav.
- Dashboard `/`: greeting/date header, Tareas del día card, Calendario mini month grid + Próximos vencimientos, Materias entry cards linking to `/study`.
- Move task list to `/tareas` (reuse TaskList/TaskForm, `use:enhance` actions).
- Estudia-style cards/typography on shell + dashboard via existing `tokens.css`; additive tokens only if required.
- Spanish UI (matches app and reference).

### Out of Scope

- Studyboard per-subject pages (later change) — Materias links to `/study`.
- Document library CRUD — nav linkage to `/documents` only.
- Auth redesign, dark-mode toggle, data-layer changes.

## Capabilities

### New Capabilities

- `app-shell`: sticky header, brand, nav, responsive desktop/mobile navigation.
- `dashboard`: `/` aggregation — greeting, tasks summary, mini calendar, upcoming deadlines, subject entry.

### Modified Capabilities

- `quick-tasks`: tasks page relocates from `/` to `/tareas` (route-level behavior change).

## Approach

Svelte 5 runes components under `src/lib/components/` (AppHeader, dashboard cards), reusing TaskList/ObjectiveGrid/ObjectiveList. `+layout.svelte` gains the sticky header; `/` load reads bounded tasks + objectives via existing repositories; per-page `svelte:head` titles. Scoped CSS on tokens; no new dependencies.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/routes/+layout.svelte` | Modified | Estudia header + responsive nav |
| `src/routes/+page.svelte` / `+page.server.ts` | Modified | Dashboard replaces task list; loads tasks + objectives |
| `src/routes/tareas/` | New | Task page (TaskList/TaskForm reuse) |
| `src/lib/components/` | New | AppHeader, dashboard cards |
| `src/lib/styles/tokens.css` | Modified | Additive tokens only, if needed |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Token additions break existing components | Med | Additive only, AA-verified |
| `/` relocation breaks bookmarks | Low | `/tareas` in nav; data unchanged |
| Review budget (400 lines) exceeded | Med | One PR; keep task-move minimal |

## Rollback Plan

Revert the PR; existing routes, components, and repositories remain untouched — tasks return to `/`.

## Dependencies

- None beyond existing `tasks`/`objectives` repositories and `tokens.css`.

## Success Criteria

- [ ] `/` renders dashboard with tasks, calendar, deadlines, subject entry.
- [ ] `/tareas` hosts full task list; all actions work.
- [ ] `scripts/ci.sh` passes (lint, vitest, build).
- [ ] Focus-visible, reduced motion, AA contrast preserved.