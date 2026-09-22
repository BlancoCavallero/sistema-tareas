# Apply Progress — dashboard-estudia-shell

Change: `dashboard-estudia-shell`
Store: openspec · Mode: Standard (strict_tdd: false)
Delivery: chained PRs (stacked-to-main), slice = Work Unit 4 (PR 4 of 4, FINAL)
Attempt: `apply-pr4-cards-001` (orchestrator owns the attempt ledger for this run — no acquire/settle executed here)

## Slice Scope (PR 4 run — FINAL)

Work Unit 4 — Compact calendar/deadlines/subjects + tokens (PR 4 of 4). Tasks 3.4–3.8 (remaining Phase 3 cards/tokens), Phase 4 (4.1–4.3 integration & verification) and Phase 5 (5.1 cleanup). This slice completes the change: **21/21 tasks**.

## Work Unit Evidence (PR 4 — this run, cumulative final state)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `npm run test -- src/lib/components/objectives.test.ts src/lib/components/dashboard/ src/routes/page.test.ts` → 8 files, 61/61 tests passed (branch `feature/dashboard-estudia-shell-pr4-cards`, vitest 4.1.11): objectives 22, dashboard cards 25 (DashboardCard 5, GreetingHeader 5, TasksTodayCard 5, MiniCalendarCard 6, UpcomingDeadlinesCard 5, SubjectsCard 4), root page 9 |
| Runtime harness command/scenario and exact result | `wrangler pages dev` over the production build (`.svelte-kit/cloudflare`, local D1 with migrations applied, real auth gate; bindings SESSION_SECRET + PASSWORD_HASH minted per the app's PBKDF2/HMAC formats) — 8/8 checks PASS: (1) `/` no cookie → 303 `/login`; (2) `/login` → 200; (3) `/` with valid session → 200 with all four cards + Spanish title, **no** `?/create` action and no "Crear tarea" button at root; (4) `/tareas` → 200 with task list + create form; (5) POST `/tareas?/create` (title + `recurrence_type=none`, Origin header like `use:enhance` sends) → 200 ok; (6) re-GET `/tareas` shows the created task (write landed in D1); (7) POST `/tareas?/complete` → 200 ok; (8) tampered cookie → 303 `/login`. |
| Rollback boundary | Revert the 4 commits of this slice on this branch (or the PR): removes `compact` from ObjectiveGrid + its test cases, the three new cards + their tests, the amber/violet tokens, and restores the PR-3 two-card root page + old root page test; PRs 1–3 files are separate commits and untouched. |

## Completed Tasks (cumulative — ALL 21)

### Phase 1 (PR 1, shell)

- [x] 1.1 `src/lib/components/AppHeader.svelte` created — brand → `/` (read-only), `NAV_ITEMS` const with `resolve()` hrefs (D2), inline SVG icons, desktop top nav (`aria-label="Principal"`) + fixed mobile bottom nav (`aria-label="Navegación inferior"`), active state = exact `page.url.pathname === href` → `aria-current="page"` (D3), logout, global `:focus-visible` ring (D9). No new tokens.
- [x] 1.2 `src/routes/+layout.svelte` — renders `<AppHeader />` in the non-login branch; login exclusion kept; `.shell-main` bottom padding clears the mobile bar.
- [x] 1.3 `src/lib/components/shell.test.ts` — rewritten with `$app/state` mocked via `vi.hoisted`; 9/9 green (5 links, brand, active state, logout, login standalone).

### Phase 2 (PR 2, `/tareas` relocation)

- [x] 2.1 `src/routes/tareas/+page.server.ts` — byte-identical move of the former root server file (D8): bounded load (`listTasks` + `materializeStale` + `historyForTasks` IN query) and all 5 actions (create/edit/delete/complete/uncomplete) with `taskId`/`parseRecurrence` helpers; zero behavior change. Verified byte-identical via `diff` against `git show HEAD:src/routes/+page.server.ts`.
- [x] 2.2 `src/routes/tareas/+page.svelte` — byte-identical move of the former root page: `<TaskList>` (embeds `<TaskForm>`) + Spanish title "Tareas — Sistema de Tareas".
- [x] 2.3 `src/routes/+page.server.ts` — rewritten load-only: `listTasks(25)` + `materializeStale`, `listMonth` (≤200, `monthBounds` month range following the calendar route pattern), `listObjectives` (≤25), plus `today`; actions and helpers removed.
- [x] 2.4 `src/routes/tareas/page.test.ts` — created: Spanish heading, empty state + create button, Spanish document title at `/tareas`. Root `src/routes/page.test.ts` adapted to assert the placeholder and that the root does NOT render the task list.

### Phase 3 (PR 3 + PR 4, dashboard)

- [x] 3.1 `src/lib/components/dashboard/DashboardCard.svelte` — card shell (design file-changes table): `<section aria-labelledby>` titled by a level-2 heading, default content slot ("snippet"), optional footer link (`href`/`linkLabel`); `href` typed `ResolvedPathname` (`$app/types`) so callers pass `resolve()`-resolved URLs (project lint rule `svelte/no-navigation-without-resolve`); `titleId` defaults to an accent-stripped slug of the Spanish title.
- [x] 3.2 `src/lib/components/dashboard/GreetingHeader.svelte` — `{ today, hour? }` (design); Spanish long date built from UTC parts via `Intl.DateTimeFormat('es-AR', ...)` with capitalized first letter; hour-based greeting (00–11 "Buenos días", 12–18 "Buenas tardes", 19–23 "Buenas noches" — design open question resolved: no user name); `hour` defaults to the client clock, injectable for deterministic tests.
- [x] 3.3 `src/lib/components/dashboard/TasksTodayCard.svelte` — `{ tasks, today }` (D4): filters the bounded `listTasks(25)` page in memory to `next_due === today && !done`; read-only rows (title + "Pendiente" text cue, no action buttons); footer "Ver todas" → `resolve('/tareas')`; Spanish empty state that also links to `/tareas`. Wraps `DashboardCard` (titleId="tasks-today").
- [x] 3.4 `src/lib/components/ObjectiveGrid.svelte` — added `compact = false` prop (design D5): `.month-grid.compact` with tighter cells/chips, hidden kind label (chip color still distinguishes the kind), and each compact chip carrying a visually-hidden status span ("Próxima"/"Vencida"/"Completada" via `deriveStatus`) so status never depends on color alone (D9). Non-compact grid byte-unchanged in behavior. `objectives.test.ts` extended with 5 compact cases (compact class on/off, same `<time datetime>`/single `aria-current="date"`/no `role="grid"` semantics, sr-only statuses in day order, none in the full grid).
- [x] 3.5 `src/lib/components/dashboard/MiniCalendarCard.svelte` — `{ month, today, monthKey }` (D5): wraps the compact `ObjectiveGrid` in a `DashboardCard` titled with the Spanish month name (UTC-pinned, e.g. "Septiembre de 2026"), footer "Ver calendario completo" → `resolve('/calendar')`. Consumes the bounded `listMonth` read; no new query. 6 tests.
- [x] 3.6 `src/lib/components/dashboard/UpcomingDeadlinesCard.svelte` — `{ list, today }` (D6): splits the bounded `listObjectives` page in memory — overdue not-done objectives on top with an "Urgente" text label (never color-only), then upcoming due today or later; done excluded; defensive `CARD_LIMIT = 25` slice. NOTE: the repository's `LIST_LIMIT` value cannot be imported into a client component (SvelteKit browser guard on `$lib/server` value imports — the build failed until fixed), so the limit is redeclared with the repository as the single authoritative query bound (documented in-component). 5 tests incl. 26-item bound and DOM-order split.
- [x] 3.7 `src/lib/components/dashboard/SubjectsCard.svelte` — static "Materias" card (design D7 + dashboard spec): 3 static entry tiles (blue/amber/violet tints) all linking to `resolve('/study')`; no props, no data reads (no subjects repository exists; per-subject pages are a later change). 4 tests.
- [x] 3.8 `src/lib/styles/tokens.css` — additive amber/violet tint pairs only (D7): `--color-amber`/`--color-amber-soft` + `--color-violet`/`--color-violet-soft` in `:root` and the dark scheme; blue reuses `--color-accent-soft`. Contrast measured (see task 4.3).
- [x] 3.9 `src/routes/+page.svelte` — dashboard with all four cards: `GreetingHeader` + 12-column grid via named `grid-template-areas` (Tareas tall left 7 cols over Próximos vencimientos 5 cols right; Materias full width below — mirrors the design reference layout), stacks to one column ≤640px; `MiniCalendarCard` gets `monthKey={data.today.slice(0, 7)}`; entrance animation uses token durations so the global reduced-motion override collapses it; Spanish title "Inicio — Sistema de Tareas".
- [x] 3.10 `src/routes/page.test.ts` — full dashboard assertions (9 tests): greeting + long date, only today's pending tasks in the card, "Ver todas" → `/tareas`, mini-calendar region (Spanish month name) with its chip + "Ver calendario completo" → `/calendar`, single `aria-current="date"` on today, deadlines region with "Urgente" for overdue, Materias region links → `/study`, no task list/CRUD at root, Spanish title. Plus `src/lib/components/dashboard/*.test.ts` (DashboardCard 5, GreetingHeader 5, TasksTodayCard 5, MiniCalendarCard 6, UpcomingDeadlinesCard 5, SubjectsCard 4).

### Phase 4 (PR 4, integration & verification)

- [x] 4.1 `./scripts/ci.sh` → exit 0 (npm ci + prettier + eslint + vitest **19 files / 181 tests** + build `✔ done`); `npm run check` (svelte-check) → 0 errors, 0 warnings.
- [x] 4.2 Real runtime harness via `wrangler pages dev` (production build + local D1 + real auth gate) — 8/8 checks PASS; see Work Unit Evidence table above. Root exposes no task CRUD; `/tareas` create/complete actions work over the same endpoint `use:enhance` posts to (Origin-header check passed — SvelteKit CSRF rejects header-less POSTs, browsers always send Origin).
- [x] 4.3 Manual a11y evidence:
  - **Focus-visible**: global `:focus-visible` ring (tokens.css, PR 1/D9) applies to every new interactive element — the Materias tile links inherit it; no component overrides it.
  - **AA contrast** (measured, WCAG relative-luminance formula): light amber `#9a6700` on `#fff8c5` = **4.52:1**; light violet `#8250df` on `#fbefff` = **4.54:1**; dark amber `#d29922` on `#3d2f00` = **5.18:1**; dark violet `#a371f7` on `#271052` = **4.88:1** — all ≥ 4.5:1. Existing tokens untouched.
  - **Reduced motion**: the dashboard entrance animation uses `var(--duration-base)`/`var(--ease-out)`; the global `@media (prefers-reduced-motion: reduce)` override in tokens.css collapses it (durations → 0ms + `animation-duration: 0.01ms !important`).
  - **Never color-only**: "Urgente" (deadlines), "Pendiente" (tasks), chip status "Próxima"/"Vencida"/"Completada" (compact grid, sr-only) are all text cues plus color.

### Phase 5 (PR 4, cleanup)

- [x] 5.1 No dead nav/code; per-page Spanish titles: all 6 pages set Spanish `<title>` via `svelte:head` (Inicio, Tareas, Calendario, Estudio, Documentos, Iniciar sesión); the 5 `NAV_ITEMS` + brand hrefs (`/`, `/tareas`, `/calendar`, `/study`, `/documents`) all resolve to existing routes; no placeholder/"next PR"/temporary comments remain in `src/`; the `month`/`list` load fields are now consumed by the calendar/deadlines cards (PR 3 note retired).

## Deviations from Design

- **`UpcomingDeadlinesCard` cannot import `LIST_LIMIT` from the repository.** The SvelteKit browser guard rejects `$lib/server` value imports in client components (build failed with `vite-plugin-sveltekit-guard` until fixed). The card declares `CARD_LIMIT = 25` locally with the repository's `LIST_LIMIT` documented as the single authoritative query bound. Behavior identical — the in-memory bound matches the design's "bound 25".
- **`DashboardCard` `href` typed `ResolvedPathname`** rather than `string` (PR 3): the project's `svelte/no-navigation-without-resolve` rule requires every link value to be `resolve()`-derived; a `string`-typed prop fails the rule's type check. Callers still pass `resolve()`-resolved hrefs — typing refinement of D2, not a behavior change.
- **Root page layout uses named `grid-template-areas`** (Tareas 7 cols over the right 5-col column of Calendario + Próximos vencimientos; Materias full width below) instead of per-card span classes: mirrors the design-reference layout (left tall tasks, right column stacked calendar/vencimientos, full-width Materias) with no auto-placement gaps; stacks to one column ≤640px per the spec.
- **GreetingHeader greeting split defined in apply** (PR 3, design open question): 00–11 / 12–18 / 19–23 boundaries; no user name (the load does not carry one).

## Issues Found

- None blocking. Notes:
  - **`vite-plugin-sveltekit-guard` is a hard gate on `$lib/server` value imports in client components** — surfaced by the build, fixed by redeclaring the limit (see Deviations). Type-only imports from `$lib/server` are allowed (used everywhere).
  - SvelteKit CSRF blocks curl POSTs without an `Origin` header; browsers always send it via `use:enhance` — harness sends `Origin` like a real form (documented in the 4.2 evidence).
  - Prettier reformats `\'`-escaped quotes in test titles to double-quoted strings; formatting normalized with `npx prettier --write` (no semantic change).

## Quality Gates (touched files)

- prettier: `npx prettier --write` on all 11 touched files → clean (`--check` passes).
- eslint: `npx eslint` on the 11 touched files → 0 errors (tokens.css skipped — no matching config, pre-existing).
- svelte-check: `npm run check` → 0 errors, 0 warnings.
- Focused suite: `npm run test -- src/lib/components/objectives.test.ts src/lib/components/dashboard/ src/routes/page.test.ts` → 8 files / 61 tests passed.
- Full unit suite: `npm run test` → 19 files / 181 tests passed (unit + workers projects).
- Build: `npm run build` → exit 0.
- CI: `./scripts/ci.sh` → exit 0 (npm ci, lint, test, build).

## Ledger Note (PR 2 — historical, orchestrator owns current run's ledger)

`gentle-ai sdd-attempt status` reported the slice-2 objective as `decision_required: true`, `complete: false`, `changed_line_budget_exceeded: true` (`next_action: reset`). The settle recorded `outcome: passed` with evidence revision `sha256:65194edb…`; the objective then needs a maintainer reset: `gentle-ai sdd-attempt reset --cwd <repo> --change dashboard-estudia-shell --expected-revision sha256:59fa63a2119b0193599dbc8293aea409b3e907577e72efff4bd866b93ecf5c72 --request-id "<unique>" --reason "..." --actor "<maintainer>"`.

## Workload Notes (PR 3 + PR 4 — honest authored counts)

- **PR 3 slice**: 514 changed lines (495 additions + 19 deletions — `git show --stat 9ad5b8e` = 372 insertions, `04e3737` = 123 insertions / 19 deletions), over the 400-line review budget; one cohesive unit as tasks.md defines Work Unit 3; recommended accepting as-is or recording `size:exception` for PR 3.
- **PR 4 slice (this run)**: authored count = **704 changed lines** (679 additions + 25 deletions) across the four work-unit commits: `0726a2d` compact grid = 126 (121+5), `6bf8b57` mini calendar + deadlines = 331 (331+0), `02339e4` subjects + tokens = 129 (129+0), `1f04be4` root page = 118 (98+20). Over the 400-line review budget; this is the FINAL slice completing the change, and each commit is a coherent work unit (code + tests together per work-unit-commits), so splitting further would break the test-with-code contract. Recommended: accept as-is (final slice) or record `size:exception` for PR 4.

## Commit Boundary (PR 4 — FINAL)

- Branch: `feature/dashboard-estudia-shell-pr4-cards` (based on `develop` with PRs 1–3 merged; NOT based on a PR branch — orchestrator's cached stacked-to-main: each PR targets `develop` independently and merges in order; file sets disjoint, no conflicts).
- Commits (this run, work-unit-commits — tests with code):
  1. `feat(dashboard): add compact grid mode with hidden status chips` (ObjectiveGrid.svelte + objectives.test.ts)
  2. `feat(dashboard): add mini calendar and upcoming deadlines cards` (MiniCalendarCard + UpcomingDeadlinesCard + their tests)
  3. `feat(dashboard): add subjects entry card with amber and violet tints` (SubjectsCard + test + tokens.css)
  4. `feat(dashboard): render calendar, deadlines and subjects cards at /` (+page.svelte + page.test.ts)
- NOT pushed; PR lifecycle handled by the orchestrator.