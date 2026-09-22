# Proposal: calendar-objectives

## Intent

`/calendar` is a placeholder. The organizer needs dated objectives (exams, deadlines): what is upcoming, what is overdue, and where items fall in the month. Auth, shell, nav, and D1 exist.

## Scope

### In Scope

- `migrations/0002_objectives.sql` (additive): `objectives(id, title, kind CHECK ('exam','deadline','other'), due_date TEXT, notes, done INTEGER DEFAULT 0, completed_at, created_at)` + `due_date` index. No FK, no recurrence columns.
- Pure `src/lib/domain/objectives.ts`: derived `upcoming`/`overdue`/`done` status via `today()` from `recurrence.ts`.
- Bounded, indexed `src/lib/server/objectives/repository.ts`: one `BETWEEN` month query, `LIMIT`-bounded lists.
- `/calendar` `load` + actions (create/edit/delete/toggle done); auth gate and nav reused.
- List-first UI (upcoming/overdue/all) **and** a month grid: semantic display grid (no ARIA `role="grid"`), `<time datetime>`, `aria-current="date"` on today, chips, no library.
- `src/lib/styles/tokens.css` (`:root` tokens, `color-scheme`, minimal reset) imported once from `+layout.svelte`; dark mode via `prefers-color-scheme`; `:focus-visible`, reduced motion, type/space scales.

### Out of Scope

Recurrence; reminders (in-app overdue highlighting substitutes); subject linkage; document links; quick-task coupling; full app restyle.

## Capabilities

### New Capabilities

- `calendar-objectives`: schema, derived status, bounded repository, `/calendar` list + month grid, CRUD and done toggle.
- `design-tokens`: global `:root` tokens: semantic light/dark colors, type/space/focus/motion, `color-scheme`.

### Modified Capabilities

None — the Calendario nav entry and auth gate already exist.

## Approach

Additive migration; pure domain status; structural `D1ObjectiveStore`. `load` → props; Spanish `fail(400)` validation; `use:enhance` components mirroring `TaskForm/TaskItem/TaskList`. Month grid = one indexed `BETWEEN` query (`LIMIT 200`); lists `LIMIT 25`. Overdue math uses ART `today()`, never SQL `date('now')`.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `migrations/0002_objectives.sql` | New | table + due_date index |
| `src/lib/domain/objectives.ts`, `src/lib/server/objectives/repository.ts` | New | status + bounded CRUD |
| `src/routes/calendar/+page.{server.ts,svelte}` | New/Modified | load, actions, UI |
| `src/lib/components/Objective*.svelte` | New | form / item / list / grid |
| `src/lib/styles/tokens.css`, `src/routes/+layout.svelte` | New/Modified | tokens imported once |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Grid + lists exceed 400-line budget | High | Forecast chained PRs; ask-on-risk |
| Overdue timezone off-by-one | Med | Pure domain, injected `today()`, tests |
| Unbounded scans hit D1 read cap | Low | Index + `LIMIT`; one query per view |
| Tokens bleed into app-wide restyle | Med | Bounded to calendar + foundation |
| `0002` not auto-run by Pages | Low | Additive SQL; apply before deploy |

## Rollback Plan

Revert the feature PR — placeholder returns, tokens import removed, `0001` untouched. Additive migration, so data survives; D1 Time Travel / `wrangler d1 export` is the backstop.

## Dependencies

D1 `DB` binding + migrations tooling present; `0002` applied manually before deploy. No new runtime deps.

## Success Criteria

- [ ] `/calendar` lists upcoming/overdue/all and a month grid via bounded queries.
- [ ] Overdue derived from ART `today()`; done toggle persists `done` + `completed_at`.
- [ ] Tokens drive light/dark UI; focus-visible and reduced motion honored.
- [ ] CI green; no quick-tasks or auth regressions.
