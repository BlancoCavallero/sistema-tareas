# Tasks: Estudia App Shell + Dashboard

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1200 across 19 files (raw, incl. `/tareas` (read-only) move) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 PRs: shell → `/tareas` (read-only) move → dashboard cards → calendar/deadlines |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No (user chose chained PRs, stacked)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | AppHeader + layout shell | PR 1 | `npm run test -- src/lib/components/shell.test.ts` | `npm run dev`; scroll + resize | Revert AppHeader + layout |
| 2 | `/tareas` (read-only) move; root load-only | PR 2 | `npm run test -- src/routes/tareas/page.test.ts src/routes/page.test.ts` | `npm run dev`; CRUD at `/tareas` (read-only) | Revert move; tasks back on `/` (read-only) |
| 3 | Dashboard foundation cards | PR 3 | `npm run test -- src/routes/page.test.ts src/lib/components/dashboard/` | `npm run dev`; visit `/` (read-only) | Revert cards + page rewrite |
| 4 | Compact calendar/deadlines/subjects + tokens | PR 4 | `npm run test -- src/lib/components/objectives.test.ts src/lib/components/dashboard/` | `npm run dev`; grid + Materias | Revert grid/cards/tokens |

## Phase 1: App Shell

- [x] 1.1 Create `src/lib/components/AppHeader.svelte`: brand→`/` (read-only), `NAV_ITEMS` via `resolve()`, SVG icons, desktop top + mobile bottom nav, `aria-current="page"` exact match, logout, `aria-label`. — Evidence: `npm run test -- src/lib/components/shell.test.ts` green (9 tests); AppHeader covered directly (D1–D3/D9).
- [x] 1.2 Modify `src/routes/+layout.svelte`: render `<AppHeader />`; keep login exclusion; bottom padding clears mobile bar. — Evidence: login-standalone + shell-on-app-pages layout tests green; `padding-bottom: calc(5rem + env(safe-area-inset-bottom))` under `max-width: 640px`.
- [x] 1.3 Extend `src/lib/components/shell.test.ts`: 5 links, logout, active state, login standalone. — Evidence: 9/9 passed; `$app/state` mocked via `vi.hoisted` to control pathname for exact-match active state.

## Phase 2: Task Page Relocation

- [x] 2.1 Create `src/routes/tareas/+page.server.ts`: root load + actions verbatim (D8). — Evidence: byte-identical copy of the former root `+page.server.ts` (load + create/edit/delete/complete/uncomplete actions + `taskId` / `parseRecurrence` helpers, zero behavior change); `npm run test -- src/routes/tareas/page.test.ts src/routes/page.test.ts` green (2 files, 6/6).
- [x] 2.2 Create `src/routes/tareas/+page.svelte`: TaskList + TaskForm, Spanish title. — Evidence: TaskList (which embeds TaskForm) + Spanish title "Tareas — Sistema de Tareas"; title asserted in `tareas/page.test.ts`.
- [x] 2.3 Rewrite `src/routes/+page.server.ts`: load-only (`listTasks(25)` + `materializeStale`, `listMonth`, `listObjectives`); actions removed. — Evidence: load-only with `listTasks` / `materializeStale`, `listMonth` (≤200, `monthBounds` pattern from the calendar route) and `listObjectives` (≤25) plus `today`; actions + helpers removed; root page/test adapted to a temporary placeholder (full dashboard assertion rewrite is 3.10). `npm run build` exit 0.
- [x] 2.4 Create `src/routes/tareas/page.test.ts`: task list renders at `/tareas` (read-only). — Evidence: 3 tests (Spanish heading, empty state + create button, Spanish document title) green at `/tareas` (read-only).

## Phase 3: Dashboard

- [x] 3.1 Create `src/lib/components/dashboard/DashboardCard.svelte`: title/footer-link/snippet shell.
- [x] 3.2 Create `src/lib/components/dashboard/GreetingHeader.svelte`: Spanish long date + greeting.
- [x] 3.3 Create `src/lib/components/dashboard/TasksTodayCard.svelte`: today's pending, "Ver todas"→`/tareas` (read-only), empty state (D4).
- [x] 3.4 Add `compact` to `src/lib/components/ObjectiveGrid.svelte` + hidden status chips; extend `src/lib/components/objectives.test.ts`. — Evidence: `compact` prop (default false) renders `.month-grid.compact` with tighter cells, hidden kind label, and a visually-hidden status span per chip ("Próxima"/"Vencida"/"Completada", derived via `deriveStatus`); non-compact grid unchanged. 5 new tests in `objectives.test.ts` (compact class, default off, same `<time datetime>`/`aria-current="date"` semantics, sr-only statuses in day order, none in full grid).
- [x] 3.5 Create `src/lib/components/dashboard/MiniCalendarCard.svelte`: compact grid, `<time datetime>`, `aria-current="date"` (D5). — Evidence: wraps ObjectiveGrid `compact` in a DashboardCard titled with the Spanish month name (UTC-pinned), footer "Ver calendario completo" → `/calendar` via `resolve()`; 6 tests (month-name region, compact grid + 30 `<time datetime>` days, single `aria-current="date"`, chip on due day, footer href, Spanish empty state).
- [x] 3.6 Create `src/lib/components/dashboard/UpcomingDeadlinesCard.svelte`: overdue "Urgente" + upcoming, bound 25 (D6). — Evidence: in-memory split of the root `listObjectives` page — overdue first with an "Urgente" text label (never color-only), then upcoming due today or later; done excluded; defensive `CARD_LIMIT = 25` slice (repository value cannot cross the `$lib/server` browser guard — documented in-component); Spanish dates as `<time datetime>`; 5 tests incl. 26-item bound and DOM-order split.
- [x] 3.7 Create `src/lib/components/dashboard/SubjectsCard.svelte`: static Materias → `/study` (read-only). — Evidence: DashboardCard "Materias" with 3 static tiles (blue/amber/violet tints) all linking to `/study` via `resolve()`; no props, no data reads; 4 tests (named region, 3 links all `/study`, tint classes, static tiles).
- [x] 3.8 Modify `src/lib/styles/tokens.css`: additive amber/violet tints (D7). — Evidence: `--color-amber/-soft` + `--color-violet/-soft` added to `:root` and the dark scheme only (blue reuses `--color-accent-soft`); AA verified: light amber 4.52:1, light violet 4.54:1, dark amber 5.18:1, dark violet 4.88:1 (ratios in apply-progress, task 4.3).
- [x] 3.9 Rewrite `src/routes/+page.svelte`: 12-col grid, stacks narrow, reduced-motion. — Evidence: four-card dashboard (GreetingHeader + Tareas del día + Calendario mini grid + Próximos vencimientos + Materias) in a 12-column grid via named `grid-template-areas` (Tareas tall left, Calendario over vencimientos right, Materias full width below); stacks to one column ≤640px; entrance animation uses `--duration-base`/`--ease-out` so the global reduced-motion override collapses it; `MiniCalendarCard` receives `monthKey={data.today.slice(0, 7)}`; Spanish title "Inicio — Sistema de Tareas".
- [x] 3.10 Rewrite `src/routes/page.test.ts` + create `src/lib/components/dashboard/*.test.ts`. — Evidence: root page test grows to 9 assertions (greeting + long date, only today's pending tasks, "Ver todas" → `/tareas`, mini-calendar region with chip + "Ver calendario completo" → `/calendar`, single `aria-current="date"`, deadlines region with "Urgente", Materias links → `/study`, no task CRUD at root, Spanish title); dashboard card tests total 25 (DashboardCard 5, GreetingHeader 5, TasksTodayCard 5, MiniCalendarCard 6, UpcomingDeadlinesCard 5, SubjectsCard 4).

## Phase 4: Integration & Verification

- [x] 4.1 Run `npm run lint`/`test`/`build`; `scripts/ci.sh` green. — Evidence: `./scripts/ci.sh` exit 0 (npm ci + prettier + eslint + vitest 19 files/181 tests + build `✔ done`); `npm run check` → 0 errors, 0 warnings.
- [x] 4.2 Verify `/` (read-only) has no task CRUD; `/tareas` (read-only) actions work (`use:enhance`). — Evidence: real runtime harness via `wrangler pages dev` (production build + local D1 + real auth gate): `/` without cookie → 303 `/login`; `/login` → 200; `/` with valid session → 200 with all four cards + no `?/create` action and no "Crear tarea" button; `/tareas` → 200 with task list + form; POST `?/create` → 200 ok, task visible on re-GET (write landed in D1); POST `?/complete` → 200 ok; tampered cookie → 303. Details in apply-progress.
- [x] 4.3 Manual a11y: focus-visible, AA contrast, reduced motion. — Evidence: global `:focus-visible` ring (tokens.css, PR 1) covers the new link tiles; new tint pairs measured AA (light amber 4.52, light violet 4.54, dark amber 5.18, dark violet 4.88 — all ≥ 4.5:1); entrance animation uses `--duration-base`/`--ease-out` and collapses under the global `prefers-reduced-motion` override; "Urgente"/status cues are text, never color-only.

## Phase 5: Cleanup

- [x] 5.1 Confirm no dead nav/code; per-page Spanish titles. — Evidence: all 6 pages set Spanish `<title>` (Inicio, Tareas, Calendario, Estudio, Documentos, Iniciar sesión); the 5 NAV_ITEMS + brand hrefs (`/`, `/tareas`, `/calendar`, `/study`, `/documents`) all resolve to existing routes; no placeholder/next-PR comments remain; `month`/`list` load fields are now consumed by the calendar/deadlines cards (PR 3 note retired).