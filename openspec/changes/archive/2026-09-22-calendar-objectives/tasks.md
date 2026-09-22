# Tasks: calendar-objectives

## Review Workload Forecast

Estimated changed lines: ~1,500–1,700
Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units (delivery: ask-on-risk; 6 stacked PRs, 1→6)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Schema + domain | PR 1 (base develop) | `npx vitest run --project unit src/lib/domain/objectives.test.ts` | `wrangler d1 migrations apply --local` | Revert PR 1 |
| 2 | Store + repository | PR 2 (base PR 1) | `npx vitest run --project workers src/lib/server/objectives/repository.workers.test.ts` | workerd | Revert PR 2 |
| 3 | Tokens | PR 3 (base PR 2) | `npx vitest run --project unit src/lib/components/objectives.test.ts` | `npm run dev` dark mode | Revert PR 3 |
| 4 | Route + form | PR 4 (base PR 3) | see unit 3 | `npm run dev` create | Revert PR 4 |
| 5 | Lists + item | PR 5 (base PR 4) | see unit 3 | `npm run dev` toggle | Revert PR 5 |
| 6 | Month grid | PR 6 (base PR 5) | see unit 3 | `npm run dev` nav | Revert PR 6 |

## Phase 1: Schema + Domain

- [x] 1.1 Create `migrations/0002_objectives.sql`: objectives table + due_date index; additive
- [x] 1.2 Create `src/lib/domain/objectives.ts`: deriveStatus, isObjectiveKind, monthBounds, monthGridDates, formatDisplayDate; `today` from `src/lib/domain/recurrence.ts` (read-only)
- [x] 1.3 Create `src/lib/domain/objectives.test.ts`: due-today upcoming, yesterday overdue, done never overdue; monthBounds; offset 2026-09-01→1

## Phase 2: Store + Repository

- [x] 2.1 Create `src/lib/server/db.ts`: D1Store + db(event) error(500)
- [x] 2.2 Create `src/lib/server/objectives/repository.ts`: LIST_LIMIT 25, MONTH_LIMIT 200; listObjectives, listMonth BETWEEN, CRUD, idempotent toggleDone
- [x] 2.3 Create `src/lib/server/objectives/repository.workers.test.ts`: CRUD, toggle completed_at, 30→25, BETWEEN, ordering
- [x] 2.4 Modify `src/routes/+page.server.ts`: swap to shared db helper

## Phase 3: Tokens

- [x] 3.1 Create `src/lib/styles/tokens.css`: :root tokens, color-scheme, dark, :focus-visible, reduced motion
- [x] 3.2 Modify `src/routes/+layout.svelte`: import tokens once
- [x] 3.3 Contrast-check palette (WCAG AA); adjust

## Phase 4: Route + Form

- [x] 4.1 Create `src/routes/calendar/+page.server.ts`: load (≤3 queries) + actions with Spanish fail(400)/fail(404)
- [x] 4.2 Create `src/lib/components/ObjectiveForm.svelte`: título/tipo/fecha/notas, use:enhance
- [x] 4.3 Modify `src/routes/calendar/+page.svelte`: render form, drop placeholder
- [x] 4.4 Extend `src/lib/components/objectives.test.ts`: Spanish labels, kind select, submit

## Phase 5: Lists + Item

- [x] 5.1 Create `src/lib/components/ObjectiveItem.svelte`: chips, "Vencida" cue, edit, toggle, delete
- [x] 5.2 Create `src/lib/components/ObjectiveList.svelte`: upcoming/overdue/all via $derived
- [x] 5.3 Modify `src/routes/calendar/+page.svelte`: wire sections + actions
- [x] 5.4 Extend `src/lib/components/objectives.test.ts`: sections, cue, actions

## Phase 6: Grid

- [x] 6.1 Create `src/lib/components/ObjectiveGrid.svelte`: display grid, no role=grid, time datetime, aria-current, keyed chips
- [x] 6.2 Modify `src/routes/calendar/+page.svelte`: grid + month nav
- [x] 6.3 Extend `src/lib/components/objectives.test.ts`: headers, aria-current, no role=grid, empty month

## Phase 7: Verification

- [x] 7.1 Run test/lint/build; all green — 130/130 tests, lint clean, build + svelte-check clean (pr6 head)
- [x] 7.2 Confirm all-view ≤25, ≤3 queries — load uses 2 bounded queries (list LIMIT 25 + month BETWEEN LIMIT 200); all-view is a $derived subset of the LIMIT 25 list
- [x] 7.3 Apply migration locally; note remote + PRAGMA optimize — 0002 applied clean on local D1 (slice 1); remote apply before deploy + PRAGMA optimize pending