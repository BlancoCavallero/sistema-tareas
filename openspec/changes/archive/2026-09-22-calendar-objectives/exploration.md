# Exploration: calendar-objectives

- Phase: `sdd-explore`
- Date: 2026-09-22
- Change name: `calendar-objectives`
- Artifact store: openspec (repo-local) + engram topic `sdd/calendar-objectives/explore`
- Sources: repo inspection (`src/`, `migrations/0001_init.sql`, `wrangler.jsonc`, `vite.config.ts`, `vitest.workers.config.ts`, `openspec/specs/`, archived `organizer-core` artifacts) + one targeted check of Cloudflare Pages/Workers pricing and Cron Triggers docs (2026-09-22) for the reminders question only. All other Cloudflare/D1 constraints are reused from `organizer-core/research.md` (2026-09-21), not re-researched.

---

## Current State

`organizer-core` is complete and archived. Relevant facts for this change:

- **App shell + nav already exist**: `src/routes/+layout.svelte` renders a 4-item nav — Tareas (`/`), **Calendario (`/calendar`)**, Documentos (`/documents`), Estudio (`/study`) — plus a logout form. `/calendar` is already routed and protected; it currently renders the placeholder `src/routes/calendar/+page.svelte` ("Los objetivos del calendario (exámenes, fechas límite) llegarán en una próxima versión.").
- **Auth gate is route-agnostic**: `src/hooks.server.ts` exempts only `/login` and redirects everything else without a valid HMAC cookie. A new `/calendar/+page.server.ts` is protected automatically — **zero auth work**.
- **D1 is bound and migrated**: `wrangler.jsonc` declares the `DB` binding (`migrations_dir: migrations`). `migrations/0001_init.sql` has `tasks`, `task_completions`, `login_attempts` — **no objectives table exists yet**.
- **Recurrence engine is a pure domain module**: `src/lib/domain/recurrence.ts` supports `daily | weekly | monthly`, modes `++` / `.+`, end-of-month clamping, leap years, `advance()`, load-time `materialize()`, `toRecurrenceRule(fields)`, and timezone-correct `today()` (`America/Argentina/Buenos_Aires`). It is **not** Svelte- or D1-coupled.
- **D1 repository pattern**: `src/lib/server/tasks/repository.ts` — structural `D1TaskStore` interface (no Workers types leak into domain), row→object mappers, bounded `LIST_LIMIT = 25`, single LEFT JOIN instead of N+1, `historyForTasks` with one `IN` query, idempotent `materializeStale` (≤1 UPDATE per stale task).
- **Server route pattern**: `src/routes/+page.server.ts` — local `db(event)` helper, `load` returns bounded data, `actions` (create/edit/delete/complete/uncomplete) validated from `FormData`, returning `fail(400, …)` with Spanish messages.
- **Component pattern**: `TaskForm` / `TaskItem` / `TaskList` — server data via `load` → props, local `$state` only for UI, `$derived` for computation, `use:enhance` + `invalidateAll()`, scoped `<style>`, Spanish UI copy.
- **Testing**: two vitest projects. `unit` (jsdom, `src/**/*.test.ts` excluding `*.workers.test.ts`) for domain/components; `workers` (`@cloudflare/vitest-pool-workers`) for D1 integration. `vitest.workers.config.ts` reads **all** files in `migrations/` via `readD1Migrations` — a new `0002` migration is picked up with no config change.

## Reuse Inventory (what calendar objectives can reuse)

| Existing asset | Reusable for objectives? | Notes |
|---|---|---|
| `hooks.server.ts` auth gate | ✅ Fully | Route-agnostic; `/calendar` already gated. No change. |
| `+layout.svelte` nav entry | ✅ Already present | Calendario link exists; only the page body changes. |
| `recurrence.ts` date math (`parseDate`, `formatDate`, `addDays`, `clampDay`, `compareDates`, `today`) | ✅ Fully | Generic, no task coupling. `today()` must be used for all "is it overdue?" comparisons. |
| `recurrence.ts` recurrence rules (`advance`, `materialize`, `toRecurrenceRule`) | ⚠️ Partial | Supports daily/weekly/monthly only — **no `yearly`**. Annual exam recurrence would require extending the shared union + both `switch`es (regression surface on quick-tasks tests). |
| `D1TaskStore` structural interface | ⚠️ Copy pattern | It is task-specific in name only; a small `D1ObjectiveStore` (or a shared `D1Store`) can reuse the same structural approach. |
| Repository conventions (bounded LIMIT, one query per view, row mappers, idempotent writes) | ✅ Pattern reuse | Directly applicable; objectives views are even simpler (single table, no join needed unless completion logging). |
| `db(event)` helper + `FormData` parsing/validation + `fail()` messages | ✅ Pattern reuse | Currently duplicated only once; a shared `src/lib/server/db.ts` is optional (see Affected Areas). |
| Component conventions (`use:enhance`, `invalidateAll`, props-from-load, `$derived`) | ✅ Pattern reuse | `ObjectiveForm` / `ObjectiveItem` / `ObjectiveList` mirroring the task trio. |
| Migration + `readD1Migrations` test wiring | ✅ Fully | Add `migrations/0002_objectives.sql`; integration tests need no config change. |
| `task_completions` log pattern | ⚠️ Decision | Only needed if objectives recur; for one-off dated items a `done` boolean on the row is simpler. |

## Affected Areas

- `openspec/changes/calendar-objectives/` — this exploration; downstream proposal/spec/design/tasks.
- `migrations/0002_objectives.sql` (**new**) — additive objectives schema + index. `0001` untouched.
- `src/lib/domain/objectives.ts` (**new**, likely) — status derivation (`upcoming` / `overdue` / `done`) and, if recurrence is in scope, the rule mapping. Keep pure, no runes, no D1.
- `src/lib/server/objectives/repository.ts` (**new**) — bounded, indexed queries + CRUD.
- `src/routes/calendar/+page.server.ts` (**new**) — `load` + actions.
- `src/routes/calendar/+page.svelte` (**replace placeholder**) — objectives UI.
- `src/lib/components/Objective*.svelte` (**new**) — form/item/list mirroring the task components.
- `src/lib/domain/recurrence.ts` (**modified only if yearly recurrence is confirmed**) — add `yearly` to `RecurrenceType` and both `switch`es.
- `src/routes/+layout.svelte` — likely **no change** (nav entry exists).
- `src/lib/server/tasks/repository.ts` — **no change expected**; do not couple objectives into the tasks repository.
- `openspec/specs/calendar-objectives/spec.md` (**new capability**, created by sdd-spec; `openspec/specs/` has `quick-tasks` and `user-auth` only).

## Data Model Options (shape for `0002`)

All options keep the established conventions: ISO-8601 TEXT dates (`YYYY-MM-DD`), ISO-8601 UTC timestamps, integer PK, additive migration, an index on the date column.

Baseline columns common to every option:

```sql
CREATE TABLE objectives (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('exam','deadline')),  -- 'other' if user wants
  due_date   TEXT NOT NULL,             -- YYYY-MM-DD, the exam/deadline date
  notes      TEXT,                      -- optional free text
  created_at TEXT NOT NULL              -- ISO-8601 UTC
);
CREATE INDEX idx_objectives_due_date ON objectives(due_date);
```

| Option | Adds | Pros | Cons |
|---|---|---|---|
| **A. One-off only** | `done INTEGER NOT NULL DEFAULT 0`, `completed_at TEXT` | Smallest change; matches the earlier `objectives(id,title,due_date,notes,done)` sketch; overdue is derived (`due_date < today AND done = 0`); fits the 400-line budget comfortably | No recurring exams; a `done` boolean is stored state (acceptable — it is not derived progress) |
| **B. One-off + recurrence columns** | `recurrence_type/dow/dom/mode/anchor`, `next_due` cursor, `objective_completions` log (mirrors `task_completions`) | Fully consistent with quick-tasks; reuses `advance`/`materialize`; load-time materialization gives "recurring exam" without cron | Requires `yearly` in the engine for the common annual-exam case; bigger surface; log table may be overkill for one-off items |
| **C. Recurrence columns, no log** | Recurrence columns + `next_due`, status derived | Avoids the extra table | Cannot distinguish "occurrence completed" cleanly for recurring items without a log; weaker than the tasks precedent |

Subject linkage (orthogonal to the above) — **the `subjects` table does not exist yet** (study-pages change owns it):

- **S1. Defer**: no subject column now. Cheapest; add it in the study-pages change.
- **S2. Nullable `subject_id INTEGER` now, no FK**: groups objectives by subject from day one. SQLite `ALTER TABLE ADD COLUMN` cannot add a FK later, so if a real FK is ever wanted the table must be rebuilt — an argument for adding the plain column now if subject grouping is a near-term want.
- **S3. `subject TEXT` free text now**: quick grouping, but duplicates the future `subjects` entity and creates a migration/cleanup burden. Not recommended.

## Approaches

### 1. View scope (how much calendar UI)

1. **List views only (upcoming / overdue / all)** — a bounded, date-ordered list with kind badges and overdue highlighting. No month grid.
   - Pros: small, indexed single-table queries, fits the review budget, ships the product value (know what's coming, spot what's overdue).
   - Cons: not a "calendar" visually; no month navigation.
   - Effort: Low.
2. **Month grid + list** — a month view querying `due_date BETWEEN month_start AND month_end`, plus a list.
   - Pros: matches the nav label "Calendario"; intuitive for exams/deadlines.
   - Cons: significantly more UI/date-layout logic and tests; risk of exceeding the 400-line budget; needs careful bounded month-range queries.
   - Effort: Medium–High.
3. **Month grid that also shows quick tasks** — unify `objectives.due_date` and `tasks.next_due` in one calendar.
   - Pros: a single "what's happening" view.
   - Cons: cross-module coupling (two repositories, two date semantics: `next_due` is a recurrence cursor, not an event date); a recurring task would appear once at its cursor, which is misleading; scope creep.
   - Effort: High.

### 2. Recurrence scope

1. **No recurrence (one-off objectives)** — exams/deadlines are single dated events.
   - Pros: smallest, no engine change, no shared-domain regression risk; the engine can be added later additively.
   - Cons: annual exams must be re-entered each year.
   - Effort: Low.
2. **Reuse daily/weekly/monthly as-is** — covers "study deadline every month"-style cases.
   - Pros: no engine change.
   - Cons: does not cover annual exams, which is the most natural recurring objective.
   - Effort: Low.
3. **Extend the engine with `yearly`** — add the type to `RecurrenceType` and `advance`/`materialize`, plus `recurrence_month` handling.
   - Pros: real annual-exam support; one date-math source of truth.
   - Cons: touches a shared module covered by existing quick-tasks tests; needs clamping rules for Feb 29; must be explicitly scoped.
   - Effort: Medium.

## Product Decisions (need user confirmation before proposing)

1. **Recurrence**: are exams/deadlines one-off, or do some repeat (annually/monthly)? If any repeat annually, decide whether this change extends the engine with `yearly` or defers recurrence.
2. **View style**: simple upcoming/overdue lists (recommended first cut) vs a full month grid vs a grid that also shows quick tasks.
3. **Completion semantics**: does an objective have a manual "done" toggle (exam taken / deadline submitted), or does it simply become "past" when the date passes? Is "overdue" a derived visual state (`due_date < today AND not done`) — recommended — or a stored status?
4. **Subject linkage**: defer subject grouping to the study-pages change (S1), or add a nullable `subject_id INTEGER` now without FK (S2)? (S3 free-text is not recommended.)
5. **Kind taxonomy**: is `exam | deadline` enough, or is a third `other`/`task`-like kind wanted?
6. **Reminders/notifications**: confirmed **out of scope** (see constraints). Confirm the free substitute is acceptable: in-app overdue/upcoming highlighting only.

## Cloudflare / D1 Constraints (reused from `organizer-core/research.md`)

- **Bounded, indexed reads are mandatory**: D1 Free enforces 5M rows read/day and 100k rows written/day, hard-enforced since 2026-09-01; an unbounded scan can brick queries until the UTC reset (L1-1, L1-2). Every objectives view MUST be `LIMIT`-bounded and index-backed (`idx_objectives_due_date`).
- **50 queries per invocation (Free)** (L1-3): a month view must be **one range query** (`due_date BETWEEN ? AND ?`), never one query per day; a list view is one query. If subject grouping is added later, resolve it with a JOIN, not N+1.
- **No cron in the current architecture**: quick-tasks deliberately uses load-time materialization instead of background jobs (L4-6, spec "Recurrence with `++` semantics"). Any recurring-objective design MUST follow the same load-time pattern; there is no scheduled trigger in this Pages project.
- **10 ms CPU/request (Free)** (L3-1): date math is trivial; keep status/overdue derivation in a pure domain module and do not add heavy crypto or server-side file processing to `/calendar`.
- **Migrations are not auto-run by Pages**: `0002` must be applied with `wrangler d1 migrations apply sistema-tareas --local|--remote` before deploy; keep it additive (`CREATE TABLE` / `CREATE INDEX`) so rollback is a code revert with data preserved.
- **Reminders are out of scope**: Cron Triggers are a Workers `scheduled()` feature (Workers docs, 2026-09-04); this project is a Pages project whose Functions are HTTP-request-driven (Pages Functions pricing/routing docs, checked 2026-09-22). Delivering a reminder would also require an outbound channel (email/push) that is not free/native. A future option is a separate Worker with a Cron Trigger, or a third-party email API — both are new infrastructure, so they belong in a later, separately-scoped change if ever wanted.
- **Test wiring is free**: `vitest.workers.config.ts` reads the whole `migrations/` directory, so `0002` is applied automatically in the `workers` test project.

## Interaction With Future Modules

- **Study pages (subject → topic → ideas)**: objectives will want a subject link. The `subjects` table is owned by the study-pages change, so either defer the link or add a plain nullable `subject_id` now (no FK) — see decision 4. Do not create study tables here.
- **Document library**: objectives could reference study material, but the established rule is unidirectional (`study → document` only; documents carry no back-references). If objectives ever reference documents, it would be a new join table in the document-library change — out of scope here.
- **Quick tasks**: keep the modules separate (separate table, repository, route). The only shared asset is `recurrence.ts` and the `today()` convention. Do not put objectives on the tasks page.
- **Date display convention**: `TaskItem` currently renders raw `YYYY-MM-DD`. Objectives should keep ISO in the DB and format for display (Spanish) in the UI; if a shared formatter is introduced, keep it a tiny pure helper so tasks can adopt it later without coupling.

## Recommendation

Build `calendar-objectives` as a **small, additive, list-first module**:

- New `objectives` table via `migrations/0002_objectives.sql` with `id, title, kind (exam|deadline), due_date, notes, created_at, done, completed_at` and an index on `due_date` (**Option A**), unless the user confirms recurring objectives, in which case take **Option B** (recurrence columns + `objective_completions` log + a `yearly` extension to the shared engine).
- **Overdue is derived, never stored** (`due_date < today AND done = 0`), computed in a pure `objectives.ts` using `today()` from the recurrence module — consistent with the project's "progress is derived" rule.
- **List-first UI** (upcoming / overdue / all) mirroring `TaskForm`/`TaskItem`/`TaskList`, with `load` → props, `use:enhance`, bounded indexed queries. Treat the month grid as a follow-up if the list view is not enough.
- **No auth, shell, or nav work**: the gate and the Calendario nav entry already exist.
- **No subject FK, no document links, no reminders** in this change; record them as explicit follow-ups.
- Reuse `recurrence.ts` date utilities; only touch its rule engine if yearly recurrence is confirmed.

This keeps the change well inside the 400-line review budget and avoids the two main traps: coupling objectives into quick tasks, and a month-grid scope explosion.

## Risks

- **Recurrence engine gap (`yearly`)**: annual exams are the most likely recurring objective, and the engine cannot express them today. Extending it touches shared quick-tasks tests — a regression surface. Mitigation: decide recurrence scope up front; if in scope, add `yearly` with dedicated unit tests and keep it additive.
- **Scope creep into a calendar grid**: a month view plus date layout plus tests can exceed the 400-line budget quickly. Mitigation: list-first; forecast chained PRs if a grid is confirmed.
- **Subject-link timing**: SQLite cannot add a FK to an existing table via `ALTER TABLE ADD COLUMN`; deferring a real FK means either a plain integer column now or a table rebuild later. Mitigation: make decision 4 explicit before the design.
- **Timezone/off-by-one**: "overdue" must be computed with `today()` (ART) and ISO string comparison, never with a local `new Date()`. Mitigation: pure domain function with injected `today`, unit-tested.
- **Unbounded month/range queries**: a grid or a naive "all objectives" view can scan the table. Mitigation: `LIMIT` + indexed date range; one query per view.
- **Cross-module coupling on the calendar**: showing quick tasks on the calendar mixes two date semantics (`next_due` cursor vs event date) and two repositories. Mitigation: keep objectives-only for now.
- **Migration/deploy discipline**: `0002` must be applied before deploy (Pages does not auto-run migrations). Mitigation: additive migration + deploy note, same as `0001`.

## Open Questions (user decisions before proposal)

1. Do exams/deadlines ever repeat — and if so, is annual recurrence required in this change (extend the engine with `yearly`) or deferred?
2. List-first views (recommended) or a month grid? Should the calendar also show quick tasks (not recommended)?
3. Completion model: manual "done" toggle (recommended) vs date-only status; confirm overdue is a derived visual state.
4. Subject linkage: defer (S1) or add nullable `subject_id` without FK now (S2)?
5. Is `exam | deadline` the full kind taxonomy, or is `other` needed?
6. Confirm reminders/notifications are out of scope and in-app overdue highlighting is the accepted substitute.

## Ready for Proposal

**Yes** — the codebase investigation is complete and the reuse surface is clear. The orchestrator should present the recommendation and the six product decisions above to the user before `sdd-propose`. Proposed scope: additive `objectives` schema (0002) + pure status domain + bounded repository + list-first `/calendar` UI reusing the established patterns; recurrence, subject linkage, month grid, and reminders are explicit follow-up decisions.
