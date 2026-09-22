# Tasks: organizer-core

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Work Units

| Unit | Goal | Likely PR | Test command | Harness | Rollback |
|------|------|-----------|--------------|---------|----------|
| 1 | Infra + auth + shell (1.x–3.x, 5.2, 5.3, 5.5) | PR 1 | `npx vitest run ./src/lib/server/auth ./src/routes/login` (read-only) | `wrangler dev` (read-only): login, tamper | Revert PR 1; additive schema |
| 2 | Quick-tasks (4.x, 5.1, 5.4, 5.6) | PR 2 (base=PR 1) | `npx vitest run ./src/lib/domain ./src/lib/server/tasks` (read-only) | `wrangler dev` (read-only): complete → next_due | Revert PR 2; tables unused |

## Phase 1: Infra

- [x] 1.1 Modify `/home/federico/Projects/SistemaTareas/wrangler.jsonc`: `d1_databases` binding `DB`; AC: dev resolves
- [x] 1.2 Modify `/home/federico/Projects/SistemaTareas/src/app.d.ts`: `Env` += `SESSION_SECRET`, `PASSWORD_HASH`; AC: `tsc` passes (read-only)
- [x] 1.3 Create `/home/federico/Projects/SistemaTareas/migrations/0001_init.sql`: 3 tables + indexes; AC: applies to fresh D1
- [x] 1.4 Create `/home/federico/Projects/SistemaTareas/.dev.vars`; gitignore it; AC: untracked
- [x] 1.5 Create `/home/federico/Projects/SistemaTareas/src/lib/server/storage/types.ts`: `StorageAdapter` interface; AC: compiles
- [x] 1.6 Add `@cloudflare/vitest-pool-workers`; split `/home/federico/Projects/SistemaTareas/vite.config.ts` jsdom + workers; AC: both run
- [x] 1.7 Apply `wrangler d1 migrations apply --local|--remote` (read-only); note Pages never auto-runs; AC: pre-deploy

## Phase 2: Authentication

- [x] 2.1 Create `/home/federico/Projects/SistemaTareas/src/lib/server/auth/password.ts`: PBKDF2 15k verify, `pbkdf2$sha256$15000$salt$hash` (read-only); AC: correct/wrong
- [x] 2.2 Create `/home/federico/Projects/SistemaTareas/src/lib/server/auth/session.ts`: HMAC sign/verify, `st_session` httpOnly/lax/30d (read-only); AC: tamper rejected
- [x] 2.3 Create `/home/federico/Projects/SistemaTareas/src/lib/server/auth/rate-limit.ts`: 5/15 min/IP in D1; AC: 6th blocked
- [x] 2.4 Create `/home/federico/Projects/SistemaTareas/src/hooks.server.ts`: fail-closed gate, exempt `/login` (read-only); AC: env missing → redirect, no data
- [x] 2.5 Create `/home/federico/Projects/SistemaTareas/src/routes/login/+page.server.ts`: rate limit→verify→cookie→303, generic error; AC: wrong pw, no cookie
- [x] 2.6 Create `/home/federico/Projects/SistemaTareas/src/routes/login/+page.svelte`: Spanish form, `use:enhance` (read-only); AC: submits, generic error
- [x] 2.7 Create `/home/federico/Projects/SistemaTareas/src/routes/logout/+server.ts`: POST destroys cookie; AC: next request redirected

## Phase 3: App shell

- [x] 3.1 Modify `/home/federico/Projects/SistemaTareas/src/routes/+layout.svelte`: nav Tareas/Calendario/Documentos/Estudio; AC: renders
- [x] 3.2 Create `/home/federico/Projects/SistemaTareas/src/routes/calendar/+page.svelte`, `/home/federico/Projects/SistemaTareas/src/routes/documents/+page.svelte`, `/home/federico/Projects/SistemaTareas/src/routes/study/+page.svelte`: placeholders; AC: each under gate

## Phase 4: Quick tasks

- [x] 4.1 Create `/home/federico/Projects/SistemaTareas/src/lib/domain/recurrence.ts`: pure advance/materialize/today, `++`/`.+` (read-only), clamping; AC: 5.1 green
- [x] 4.2 Create `/home/federico/Projects/SistemaTareas/src/lib/server/tasks/repository.ts`: LEFT JOIN list LIMIT 25, CRUD, history; AC: ≤26 queries, no N+1
- [x] 4.3 Create `/home/federico/Projects/SistemaTareas/src/routes/+page.server.ts`: load materializes stale `++` (read-only); actions; AC: logs `max(next_due,today)` (read-only), advances
- [x] 4.4 Create `/home/federico/Projects/SistemaTareas/src/lib/components/TaskForm.svelte`, `/home/federico/Projects/SistemaTareas/src/lib/components/TaskItem.svelte`, `/home/federico/Projects/SistemaTareas/src/lib/components/TaskList.svelte`; AC: render from props
- [x] 4.5 Modify `/home/federico/Projects/SistemaTareas/src/routes/+page.svelte`: wire components, done from join; AC: transient done

## Phase 5: Testing

- [x] 5.1 Unit `/home/federico/Projects/SistemaTareas/src/lib/domain/recurrence.test.ts`: clamp 29–31, leap, `. +` (read-only), skip, idempotent; AC: jsdom green
- [x] 5.2 Unit `/home/federico/Projects/SistemaTareas/src/lib/server/auth/password.test.ts` + `/home/federico/Projects/SistemaTareas/src/lib/server/auth/session.test.ts`: format, verify, sign/verify/tamper; AC: jsdom green
- [x] 5.3 Unit `/home/federico/Projects/SistemaTareas/src/lib/server/auth/rate-limit.test.ts`: window; AC: jsdom green
- [x] 5.4 Integration `/home/federico/Projects/SistemaTareas/src/lib/server/tasks/repository.test.ts` (workers): CRUD, advance, uncomplete, CASCADE, bounded, materialize; AC: workers green
- [x] 5.5 Integration auth gate (workers): no/tampered cookie, secret missing fail-closed, login ok/wrong; AC: workers green
- [x] 5.6 Component (jsdom): login form, task list, nav, Spanish labels; AC: green