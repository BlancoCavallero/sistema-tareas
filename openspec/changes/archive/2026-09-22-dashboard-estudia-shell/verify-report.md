```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:6e7a7343ce40726131528de18789b5746b1f7c446ee1dd8e8dc3011463cb541a
verdict: pass
blockers: 0
critical_findings: 0
requirements: 15/15
scenarios: 26/26
test_command: npm run test
test_exit_code: 0
test_output_hash: sha256:865d924ec78cdc8aa7e543e5f5d1612fd3db8dceee58dc3755a0496745143d8f
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:48e416c834b82ca9a3f7da2f438e8d38564997e433f968b910695e123ab56888
```

## Verification Report

**Change**: dashboard-estudia-shell
**Version**: N/A (openspec delta, no version field)
**Mode**: Standard (strict_tdd: false)
**Branch**: `develop` (PRs #17 shell, #18 tareas, #19 dashboard cards, #20 final cards — all merged)

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 21 |
| Tasks complete | 21 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Tests**: ✅ 181 passed / 0 failed / 0 skipped (19 files, vitest projects: unit-jsdom + workers)
```text
$ npm run test
 Test Files  19 passed (19)
      Tests  181 passed (181)
   Duration  15.03s
exit 0 — test_output_hash sha256:865d924ec78cdc8aa7e543e5f5d1612fd3db8dceee58dc3755a0496745143d8f
```

**Build**: ✅ Passed
```text
$ npm run build   (wrangler types && vite build, adapter-cloudflare)
 Using @sveltejs/adapter-cloudflare
   ✔ done
exit 0 — build_output_hash sha256:48e416c834b82ca9a3f7da2f438e8d38564997e433f968b910695e123ab56888
```

**CI**: ✅ Passed — `./scripts/ci.sh` exit 0 (npm ci + prettier --check + eslint + vitest 19 files/181 tests + build ✔ done; origin guard passes — remote is `BlancoCavallero/sistema-tareas.git`, not the template).
**Check**: ✅ Passed (`npm run check` = wrangler types + svelte-kit sync + svelte-check: 0 errors 0 warnings, exit 0, hash 4b55372e…)
**Coverage**: ➖ Not available (no coverage threshold configured; design does not require one)

### Spec Compliance Matrix — app-shell (7 requirements, 12 scenarios)

Evidence note: CSS-only behaviors (sticky scroll, focus-visible ring, media-query nav switching, bottom padding clearance) are not evaluable in jsdom; they are verified by static inspection of `AppHeader.svelte`/`+layout.svelte`/`tokens.css` plus the apply-phase manual a11y record (task 4.3), mirroring the calendar-objectives report convention. All renderable scenarios have passing runtime tests.

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Sticky header with brand | Header stays visible on scroll | Static: `.app-header { position: sticky; top: 0; z-index: 50 }` (AppHeader.svelte); layout renders header on app pages | ✅ COMPLIANT |
| Sticky header with brand | Brand is present | `shell.test.ts > AppHeader > renders the Estudia brand linking to /` (link name "Estudia", href "/") | ✅ COMPLIANT |
| Primary navigation | All five links render | `shell.test.ts > shows the five module links in order with Spanish labels and resolved hrefs` (order Inicio/Tareas/Calendario/Materias/Documentos, hrefs `/`,`/tareas`,`/calendar`,`/study`,`/documents`) | ✅ COMPLIANT |
| Primary navigation | Materias targets the study route | same test asserts Materias href `/study` (resolve()'d) | ✅ COMPLIANT |
| Active navigation state | Active link is marked | `shell.test.ts > marks the active link with aria-current="page" by exact pathname match` (pathname `/tareas` → Tareas `aria-current="page"`, Inicio null; accent bottom-border desktop / accent-filled mobile in CSS) | ✅ COMPLIANT |
| Active navigation state | Keyboard focus is visible | Static: global `:focus-visible { outline: var(--focus-ring) }` in tokens.css (line 159); no component overrides it | ✅ COMPLIANT |
| Responsive navigation | Desktop top nav | `shell.test.ts > shows the five module links…` (top nav `aria-label="Principal"` renders 5 links) + static `@media (max-width: 640px)` hides `.top-nav`/`.logout` | ✅ COMPLIANT |
| Responsive navigation | Mobile bottom nav | `shell.test.ts > keeps logout reachable on desktop and mobile` (bottom nav `aria-label="Navegación inferior"` renders 5 links + Salir) + static media query switches to fixed bottom bar | ✅ COMPLIANT |
| Responsive navigation | Content is not obscured | Static: `+layout.svelte` `.shell-main { padding-bottom: calc(5rem + env(safe-area-inset-bottom)) }` under `max-width: 640px` | ✅ COMPLIANT |
| Logout remains reachable | Logout on desktop and mobile | `shell.test.ts > keeps logout reachable on desktop and mobile` ("Cerrar sesión" desktop + "Salir" bottom nav, same POST /logout action) | ✅ COMPLIANT |
| Login renders standalone | Login has no shell | `shell.test.ts > renders login standalone without the app shell` (pathname `/login` → no navigation, no links, child renders) | ✅ COMPLIANT |
| Page titles | Title is set | `tareas/page.test.ts > sets a Spanish document title` ("Tareas — Sistema de Tareas"); `page.test.ts > sets a Spanish document title` ("Inicio — Sistema de Tareas") | ✅ COMPLIANT |

### Spec Compliance Matrix — dashboard (7 requirements, 10 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Dashboard home route | Root is the dashboard | `page.test.ts > renders the Spanish greeting and long date header` + `does not render the task list or its actions at the root` (no "Crear tarea" button, no "No hay tareas todavía.") | ✅ COMPLIANT |
| Greeting and date header | Spanish date and greeting | `page.test.ts > renders the Spanish greeting and long date header` ("Martes, 22 de septiembre", greeting ∈ {Buenos días/tardes/noches}) + `GreetingHeader.test.ts` (5 tests incl. hour split and capitalized date) | ✅ COMPLIANT |
| Tareas del día card | Only today's pending tasks | `TasksTodayCard.test.ts > lists only today's not-done tasks with title and pending state` (done-today and other-day excluded; "Pendiente" cue) + `links "Ver todas" to /tareas` + `page.test.ts > shows only today's not-done tasks…` | ✅ COMPLIANT |
| Tareas del día card | Empty state | `TasksTodayCard.test.ts > shows a Spanish empty state linking to /tareas` ("No hay tareas para hoy." + "Ver todas las tareas" → `/tareas`) | ✅ COMPLIANT |
| Calendario mini month grid | Chips, today, and bounds | `MiniCalendarCard.test.ts > renders the compact grid with day numbers as <time datetime>` (30 days) + `marks only today with aria-current="date" and never role="grid"` (exactly 1) + `shows a chip on the day an objective is due`; bounds: root load uses `listMonth` (`MONTH_LIMIT` = 200, repository.ts) — static | ✅ COMPLIANT |
| Calendario mini month grid | Empty month | `MiniCalendarCard.test.ts > shows the Spanish empty state for a month without objectives` + `objectives.test.ts > ObjectiveGrid (compact)` cases | ✅ COMPLIANT |
| Próximos vencimientos | Upcoming only, bounded | `UpcomingDeadlinesCard.test.ts > lists not-done objectives due today or later, excluding done ones` (done excluded; due-today included) + `bounds the rendered list to 25 in memory` (26 → 25 rows) | ✅ COMPLIANT |
| Próximos vencimientos | Non-color status cue | `UpcomingDeadlinesCard.test.ts > places overdue objectives on top with the "Urgente" text label, then upcoming` (text "Urgente" + "Vencidos"/"Próximas" headings asserted) | ✅ COMPLIANT |
| Materias entry cards | Cards link to study | `SubjectsCard.test.ts > links every entry card to /study` (3 links, href `/study`) + `renders static Spanish tiles without any props` (no data reads) | ✅ COMPLIANT |
| Responsive layout and tokens | Layout follows the viewport | Static: `+page.svelte` 12-column named-area grid, `@media (max-width: 640px)` stacks to one column; components consume `var(--…)` tokens; entrance animation uses `--duration-base`/`--ease-out` and the global `prefers-reduced-motion` override (tokens.css lines 174–184) collapses it | ✅ COMPLIANT |

### Spec Compliance Matrix — quick-tasks delta (1 requirement, 4 scenarios)

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Task page route | Task list at /tareas | `tareas/page.test.ts > renders the Spanish tasks heading` + `shows the empty state in Spanish` ("No hay tareas todavía." + "Crear tarea" button) + `sets a Spanish document title` | ✅ COMPLIANT |
| Task page route | Root no longer hosts tasks | `page.test.ts > does not render the task list or its actions at the root` | ✅ COMPLIANT |
| Task page route | Existing actions still work | Byte-identical move verified: `diff` of `tareas/+page.server.ts` and `tareas/+page.svelte` against the former root files (`baaee05^`) → zero delta; all 5 actions (create/edit/delete/complete/uncomplete) + load present; apply-phase runtime harness 4.2 (8/8 PASS): POST `?/create` → 200 ok + task visible on re-GET (D1 write landed), POST `?/complete` → 200 ok | ✅ COMPLIANT |
| Task page route | Main-spec preconditions still hold | Pre-existing quick-tasks suite unchanged and green in the 181: `tasks.test.ts`, `recurrence.test.ts`, `repository.workers.test.ts`, `gate.workers.test.ts` (bounded reads, CRUD, completion history, recurrence, auth gate covers `/tareas`) | ✅ COMPLIANT |

**Compliance summary**: 26/26 scenarios compliant (22 with runtime coverage, 4 CSS-only via static inspection per design scope; 1 scenario — "Existing actions still work" — additionally backed by the apply-phase wrangler runtime harness).

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Sticky header with brand | ✅ Implemented | AppHeader: brand "Estudia" → `/`, `position: sticky`, token-driven styles, no token redeclaration |
| Primary navigation | ✅ Implemented | `NAV_ITEMS` const with `resolve()` hrefs (D2), inline SVG, `aria-label="Principal"` |
| Active navigation state | ✅ Implemented | Exact `page.url.pathname === href` → `aria-current="page"` (D3); accent border desktop / accent-filled mobile; global focus-visible ring (D9) |
| Responsive navigation | ✅ Implemented | Top nav ≥640px, fixed bottom nav ≤640px (icon + label), `env(safe-area-inset-bottom)` padding; main clears the bar |
| Logout remains reachable | ✅ Implemented | POST /logout in header (desktop) and bottom nav (mobile), behavior unchanged |
| Login renders standalone | ✅ Implemented | `+layout.svelte` renders children without AppHeader on `/login` |
| Page titles | ✅ Implemented | Spanish `<title>` via `svelte:head` on all 6 pages |
| Dashboard home route | ✅ Implemented | `/` load-only: `listTasks(25)` + `materializeStale`, `listMonth` (≤200 via monthBounds), `listObjectives` (≤25), `today`; no actions at root |
| Greeting and date header | ✅ Implemented | UTC-pinned `Intl.DateTimeFormat('es-AR')` long date; hour-based greeting (00–11/12–18/19–23), no user name |
| Tareas del día card | ✅ Implemented | In-memory `next_due === today && !done` filter (D4), read-only rows + "Pendiente" text cue, "Ver todas" → `/tareas`, empty state links |
| Calendario mini month grid | ✅ Implemented | `ObjectiveGrid compact` (D5): semantic grid, `<time datetime>`, single `aria-current="date"`, no `role="grid"`, sr-only status per chip |
| Próximos vencimientos | ✅ Implemented | In-memory overdue/upcoming split (D6), "Urgente" text label, `CARD_LIMIT = 25` defensive slice (LIST_LIMIT 25 authoritative at query level) |
| Materias entry cards | ✅ Implemented | Static tiles → `/study`, blue/amber/violet tints, no props/data reads |
| Responsive layout and tokens | ✅ Implemented | 12-col named-area grid → 1 col ≤640px; additive amber/violet tokens only (D7); reduced-motion collapsed via token durations |
| Task page route | ✅ Implemented | `/tareas` = former root page + server file byte-identical (D8); load + 5 actions + `taskId`/`parseRecurrence` helpers |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| D1 AppHeader component; layout renders it + `<main>`; login exclusion stays | ✅ Yes | `+layout.svelte` renders `<AppHeader />` in the non-login branch |
| D2 `NAV_ITEMS` const, inline SVG, `resolve()` hrefs | ✅ Yes | AppHeader `NAV_ITEMS` with `resolve('/…')`, icon snippets |
| D3 Active = exact pathname match, `aria-current="page"`, accent indicator | ✅ Yes | Test asserts exact-match semantics and no prefix highlight |
| D4 Tareas del día reuses `listTasks(25)` + `materializeStale`, in-memory filter | ✅ Yes | Card filters `next_due === today && !done`; root load unchanged contract |
| D5 `ObjectiveGrid` gains `compact` prop; MiniCalendarCard wraps it | ✅ Yes | `compact` default false; non-compact grid behavior unchanged (5 new tests) |
| D6 Vencimientos reuses `listObjectives(25)`; in-memory overdue/upcoming split | ✅ Yes | Card splits via `deriveStatus`; "Urgente" text label, never color-only |
| D7 Additive amber/violet tint tokens; blue reuses `--color-accent-soft` | ✅ Yes | tokens.css adds only `--color-amber/-soft`, `--color-violet/-soft` in both schemes; AA ratios 4.52–5.18:1 recorded (apply 4.3) |
| D8 `/tareas` server file = root load + actions verbatim; root load-only | ✅ Yes | Byte-identical diff verified against `baaee05^` root files |
| D9 Nav `aria-label`, sr-only statuses, global `:focus-visible`, reduced motion | ✅ Yes | `aria-label="Principal"`/`"Navegación inferior"`, `.sr-only` spans, global ring, token-duration animation |
| Data flow: bounded reads, only write = `materializeStale` | ✅ Yes | Root load: `listTasks(25)` + `materializeStale` + `listMonth` (200) + `listObjectives` (25) via Promise.all; `month`/`list`/`today` consumed by cards |

### Issues Found
**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
1. `UpcomingDeadlinesCard` redeclares `CARD_LIMIT = 25` because `$lib/server` value imports are blocked by `vite-plugin-sveltekit-guard` in client components (documented deviation). The repository's `LIST_LIMIT` stays authoritative for the query; a shared client-safe constant module would remove the duplication if the guard allows it.
2. MiniCalendarCard/ObjectiveGrid keep the same `<time datetime>`/`aria-current` semantics in compact mode — the sr-only status text is the only chip-status channel on compact chips since the kind label hides; acceptable per D9, but full-grid users get both cues.
3. The dashboard entrance animation (`card-rise`) is decorative; it collapses under reduced motion via token durations, but could be removed outright for the smallest CSS surface.

### Verdict
PASS
All 21 tasks complete; `./scripts/ci.sh` exit 0 (npm ci + lint + test + build), `npm run check` 0 errors / 0 warnings, 181/181 tests green (19 files); 15/15 requirements and 26/26 scenarios covered (22 runtime, 4 CSS-only static per design scope); design D1–D9 followed with three documented non-blocking deviations (CARD_LIMIT redeclaration, `ResolvedPathname` typing, named grid areas); no CRITICAL or WARNING findings.