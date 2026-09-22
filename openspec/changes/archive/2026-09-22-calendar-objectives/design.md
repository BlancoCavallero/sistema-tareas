# Design: Calendar Objectives

## Technical Approach

Additive `0002` migration + pure domain status (ART `today()`, never SQL date functions) + a structural-store repository. `/calendar` `load` issues exactly **2 queries/invocation**: one bounded list (`done = 0`, `LIMIT 25`, index-backed) split in memory into upcoming/overdue/all, and one `due_date BETWEEN` month query (`LIMIT 200`). Actions reuse the `db(event)` + `fail(400)` Spanish-message pattern; components mirror the `TaskForm/TaskItem/TaskList` trio with `use:enhance` + `invalidateAll`. The month grid is a semantic CSS display grid (no `role="grid"`), and a single global `tokens.css` (`:root` custom properties) drives light/dark theming. Maps to proposal approach and specs `calendar-objectives` + `design-tokens`.

## Architecture Decisions

### Decision: Month grid semantics — display grid, not ARIA `role="grid"`
| Option | Tradeoff | Decision |
|---|---|---|
| `role="grid"` + roving tabindex (APG) | Correct for interactive pickers, but requires arrow-key/Home/End machinery, one-tab-stop invariant (research L1-5, L1-6) | Rejected — dates are chosen via `<input type="date">`, the grid is a read-only visualization |
| **Semantic display grid** | 7-col CSS grid + `grid-column-start` offset, `<time datetime>`, `aria-current="date"` on today, `<ul>` chips; no keyboard machinery to fake (L1-1, L1-7) | **Accepted** — spec MUST NOT use `role="grid"` |

### Decision: Token foundation — plain CSS `:root` file, not a utility framework
| Option | Tradeoff | Decision |
|---|---|---|
| Tailwind / utility framework | New toolchain + build dep; conflicts with established scoped-`<style>` pattern (L2 verdict) | Rejected |
| Per-component tokens | Token drift; dark mode duplicated per component (L2-7) | Rejected |
| **`src/lib/styles/tokens.css` imported once from `+layout.svelte`** | Zero deps; `:root` is the canonical token point (L2-1); scoped components consume `var(--...)`; `color-scheme` + `prefers-color-scheme` dark; `:focus-visible`, reduced motion | **Accepted** — matches existing pattern exactly |

### Decision: One `load` for lists + grid vs separate loads
| Option | Tradeoff | Decision |
|---|---|---|
| Separate loads (grid route + list route) | Two round-trips, duplicated shell logic, 4+ queries | Rejected |
| **One `load` returning `{ list, month, today, monthKey }`** | Single invocation, 2 bounded queries total (≤3 budget), one `invalidateAll()` refresh for all sections | **Accepted** — spec "Month range query" satisfied by the same load |

### Decision: Repository store type — shared `D1Store` in `src/lib/server/db.ts`
| Option | Tradeoff | Decision |
|---|---|---|
| Task-specific `D1ObjectiveStore` copy | Third structural duplicate of the same `prepare/bind/first/all/run` shape; drift risk | Rejected |
| **Shared `D1Store` + `db(event)` in `src/lib/server/db.ts`** | Second route proves the helper is genuinely shared (spec instruction: decide with rationale); tasks repo untouched (keeps `D1TaskStore`, structurally identical); tasks route switches to shared helper — type-safe via structural typing | **Accepted** — one canonical store type, zero behavior change to quick tasks |

### Decision: List query shape — one bounded query, split in memory
| Option | Tradeoff | Decision |
|---|---|---|
| 3 list queries (upcoming/overdue/all) + month | 4 queries/invocation — breaks the ≤3 budget | Rejected |
| **1 query `done = 0 ORDER BY due_date, id LIMIT 25`, split in memory** | Research-endorsed "1 query split in memory" (L3); every view stays ≤25 and date-ordered (spec); 2 queries total | **Accepted** — when >25 overdue exist, upcoming may be cut off the page; acceptable for a single-user organizer, mitigated by the grid + "all" view |

## Data Flow

```
Browser (SSR) → hooks.server.ts (HMAC gate) → calendar/+page.server.ts (load/actions)
     → objectives/repository.ts (D1Store, bounded SQL) → D1
     ← props → ObjectiveForm / ObjectiveList / ObjectiveItem / ObjectiveGrid (use:enhance, invalidateAll)
```

### Sequence: month grid load
```
Browser       hooks (HMAC ok)    calendar/+page.server.ts load     objectives/repository      D1
  │ GET /calendar?month=YYYY-MM         │                              │                      │
  │────────────────────────────────────▶│ today() = ART                │                      │
  │                                     │ bounds = monthBounds(y, m)   │                      │
  │                                     │── listObjectives(todayStr) ─▶│── SELECT done=0 ────▶│
  │                                     │                              │ (idx, LIMIT 25)     │
  │                                     │── listMonth(start, end) ─────▶│── SELECT BETWEEN ─▶│
  │                                     │                              │ (idx, LIMIT 200)   │
  │◀─ props {list, month, today} ───────│                              │                      │
  │   ($derived: upcoming/overdue/all; grid cells)                     │                      │
```

### Sequence: done toggle
```
Browser   hooks (HMAC ok)   action ?/toggle (use:enhance)   objectives/repository   D1
  │ POST ?/toggle(id)               │                            │                    │
  │────────────────────────────────▶│── toggleDone(id, now) ────▶│── SELECT done ────▶│
  │                                 │                            │ flip; completed_at │
  │                                 │                            │── UPDATE ─────────▶│
  │◀─ {ok}; invalidateAll() ────────│                            │                    │
  │ GET / → load re-runs (2 bounded queries)                     │                    │
```

## File Changes

| File | Action | Description |
|---|---|---|
| `migrations/0002_objectives.sql` | Create | `objectives` table + `idx_objectives_due_date`; additive |
| `src/lib/domain/objectives.ts` | Create | Pure: `deriveStatus`, `isObjectiveKind`, `monthBounds`, `monthGridDates`, `formatDisplayDate` |
| `src/lib/server/db.ts` | Create | Shared `D1Store` structural type + `db(event)` helper |
| `src/lib/server/objectives/repository.ts` | Create | Bounded CRUD, list, month, toggle (no N+1, index-backed) |
| `src/routes/calendar/+page.server.ts` | Create | `load` (2 queries) + actions create/edit/delete/toggle; `fail(400)` Spanish messages |
| `src/routes/calendar/+page.svelte` | Replace | Placeholder → lists + grid + month nav (`?month=YYYY-MM`) |
| `src/lib/components/ObjectiveForm.svelte` | Create | Create form (título/tipo/fecha/notas), `use:enhance` |
| `src/lib/components/ObjectiveItem.svelte` | Create | Kind/status chips, inline edit, toggle, delete |
| `src/lib/components/ObjectiveList.svelte` | Create | Upcoming/overdue/all sections from one list (`$derived`) |
| `src/lib/components/ObjectiveGrid.svelte` | Create | Semantic display grid, `<time datetime>`, `aria-current="date"`, keyed chips |
| `src/lib/styles/tokens.css` | Create | `:root` tokens, `color-scheme`, minimal reset, focus, reduced motion |
| `src/routes/+layout.svelte` | Modify | `import '$lib/styles/tokens.css'` (once) |
| `src/routes/+page.server.ts` | Modify | Swap local `db()` for shared `$lib/server/db` (structural, type-safe) |
| Tests ×4 | Create | `objectives.test.ts`, `objectives.workers.test.ts`, `objectives-components.test.ts`, `tokens` covered via component tests |

## Interfaces / Contracts

```sql
-- migrations/0002_objectives.sql (additive; 0001 untouched)
CREATE TABLE objectives (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('exam','deadline','other')),
  due_date     TEXT NOT NULL,             -- YYYY-MM-DD, ISO-8601 text
  notes        TEXT,
  done         INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,                      -- ISO-8601 UTC, set when done = 1
  created_at   TEXT NOT NULL              -- ISO-8601 UTC
);
CREATE INDEX idx_objectives_due_date ON objectives(due_date);
```

```ts
// src/lib/server/db.ts — canonical structural store (no Workers types leak)
export interface D1Store {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
      all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<{ success: boolean; meta?: { last_row_id?: number } }>;
    };
  };
}
export function db(event: { platform?: App.Platform | null }): D1Store; // throws error(500) if unbound

// src/lib/domain/objectives.ts (pure, no runes, no D1)
export type ObjectiveKind = 'exam' | 'deadline' | 'other';
export type ObjectiveStatus = 'upcoming' | 'overdue' | 'done';
export function deriveStatus(dueDate: string, done: boolean, todayStr: string): ObjectiveStatus;
//   done → 'done'; dueDate < todayStr → 'overdue'; else 'upcoming' (due today = upcoming).
export function isObjectiveKind(v: string): v is ObjectiveKind;
export function monthBounds(year: number, month: number): { start: string; end: string };
export function monthGridDates(year: number, month: number): (string | null)[]; // null = leading blank
export function formatDisplayDate(iso: string): string; // Spanish, Date.UTC-safe

// src/lib/server/objectives/repository.ts
export const LIST_LIMIT = 25; export const MONTH_LIMIT = 200;
export interface ObjectiveRow {
  id: number; title: string; kind: ObjectiveKind; due_date: string;
  notes: string | null; done: boolean; completed_at: string | null; created_at: string;
}
listObjectives(store: D1Store, todayStr: string, limit?: number): Promise<ObjectiveRow[]>;
//   WHERE done = 0 AND due_date < ?  → overdue   |  due_date >= ?  → upcoming  (split in memory)
listMonth(store: D1Store, start: string, end: string, limit?: number): Promise<ObjectiveRow[]>;
//   WHERE due_date BETWEEN ? AND ? ORDER BY due_date, id LIMIT ?   (indexed)
getObjective(store, id); createObjective(store, input); updateObjective(store, id, fields);
deleteObjective(store, id);
toggleDone(store: D1Store, id: number, opts?: { now?: string }): Promise<{ id: number; done: boolean } | null>;
//   SELECT current done → flip; UPDATE done = ?, completed_at = (done ? now : NULL); idempotent (2 queries)
```

Route actions: `create`/`edit` validate `title` (trim, required → `'El título es obligatorio.'`), `kind` via `isObjectiveKind` (`'El tipo no es válido.'`), `due_date` via regex + `parseDate` (`'La fecha no es válida.'`); `toggle`/`delete` validate id (`'Objetivo inválido.'`); missing row → `fail(404, 'El objetivo no existe.')`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (jsdom) | `deriveStatus` boundaries (due today = upcoming; due yesterday = overdue; done never overdue), `isObjectiveKind`, `monthBounds`, `monthGridDates` offset (2026-09-01 = Tuesday → offset 1), `formatDisplayDate` | Plain vitest (mirrors `recurrence.test.ts`) |
| Integration (pool-workers) | CRUD, toggle idempotent (done + `completed_at` set; unmark clears), list `LIMIT 25` (insert 30 → 25), month `BETWEEN` excludes out-of-range rows, ordering `due_date, id` | `repository.workers.test.ts`; `0002` auto-applied by `readD1Migrations` |
| Component (jsdom) | Spanish labels; kind select; status chip shows text "Vencida" (non-color cue); grid renders weekday headers, `aria-current="date"` on today, no `role="grid"`, keyed chips; empty month | `@testing-library/svelte` (mirrors `tasks.test.ts`) |

Contrast-ratio verification of the L2 palette (research uncertainty) is an implementation task, not a unit test.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary (the `/calendar` route is HTTP-level SvelteKit routing, same scope as organizer-core).

## Migration / Rollout

- Apply `wrangler d1 migrations apply sistema-tareas --local|--remote` before deploy (Pages does not auto-run); run `PRAGMA optimize` once after (research L3-5).
- Rollback: revert the feature PR — placeholder returns, tokens import removed, `0001` untouched; additive schema preserves data; D1 Time Travel / `wrangler d1 export` backstop.
- No data migration (fresh table).

## Open Questions

- [ ] "All" view bounded to 25 is satisfied by the single `LIMIT 25` list query (each view is a subset); confirm this reading at verify — if a larger "all" is wanted it becomes a 4th query and breaks the ≤3 budget.
- [ ] Contrast ratios of the L2 palette must be verified with a checker during apply (research L2-7); the overdue chip already pairs color with the "Vencida" label so correctness never depends on a single ratio.
- [ ] Grid trailing cells: leading blanks + days only (partial last row) — pad-to-7 is a one-line UI choice deferred to apply.
- [ ] Forecast for sdd-tasks: tokens.css + grid + page + components likely exceed the 400-line budget → chained PRs recommended (slice 1 = migration/domain/repository/db + tests; slice 2 = route/components/tokens/layout).