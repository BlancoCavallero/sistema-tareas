# Design: organizer-core

## Technical Approach

D1 is the single source of truth, reached only through indexed, bounded queries (50-query/invocation cap, 5M reads/day — research L1). Auth: `hooks.server.ts` gate before any data route; PBKDF2 (WebCrypto, 15,000 iterations, once per login) verifies the single password; sessions are HMAC-SHA256-signed cookies verified on every request (10 ms CPU budget — research L3). Mutations use SvelteKit form actions + `use:enhance`; server data flows `load` → props, with `$derived` for computation (no top-level `$state` in `.svelte.ts` for server data — SSR leakage, exploration §2). Recurrence lives on the `tasks` row with a `task_completions` log; the `next_due` cursor advances with org-mode `++` semantics on completion or load, never via cron (research L4). Quick tasks are the vertical slice proving these patterns; calendar/documents/study ship as nav placeholders.

## Architecture Decisions

### Decision: D1 as source of truth
| Option | Tradeoff | Decision |
|---|---|---|
| D1 backend | Survives browser/devices; SSR-native; hard caps enforced since 2026-09-01 (runaway query bricks app until UTC reset) | **D1**, mitigated by indexed + bounded reads (page LIMIT, join not N+1) |
| localStorage-only | Zero infra, device-bound, no backup, contradicts product vision | Rejected |
| Hybrid D1 + cache | Offline resilience, but two sources of truth → sync bugs | Rejected (violates "derived, never stored") |

### Decision: PBKDF2 iteration tradeoff (below OWASP, documented)
| Option | Tradeoff | Decision |
|---|---|---|
| OWASP 600k (SHA-256) | Impossible: workerd caps PBKDF2 at 100k; 600k exceeds 10 ms CPU | Rejected |
| bcrypt / argon2 | No native Workers support; pure-JS = hundreds of ms → error 1102 | Rejected |
| **PBKDF2-HMAC-SHA256 15,000 iters** | Below OWASP minimum (recorded tradeoff) | **Accepted**: single-user threat model, hash runs once per login only, plus login rate limiting (5 attempts/15 min/IP) |

### Decision: Recurrence modeling (completions log)
| Option | Tradeoff | Decision |
|---|---|---|
| Template + instances (Taskwarrior) | Hidden templates spawn instance rows; heavy for SQLite quick tasks | Rejected |
| **Recurrence columns on `tasks` + `task_completions` log** | One row per task, `next_due` cursor; history/streaks derived from log, never stored | **Accepted**; `++` (skip-to-future) default, `.+` optional per-task; materialize on completion/load, no cron |

Semantics: completion logs `occurrence = max(next_due, today)` and advances `next_due = advance(rule, occurrence)` (pure date math — deterministic, idempotent, bounded). Load materialization advances stale `++` tasks to the next occurrence `>= today` (≤1 UPDATE per stale task). After completing a recurring occurrence the list rolls to the next occurrence (done state is transient via the action response + history view; `done` is derived from the log join).

### Decision: StorageAdapter deferral
| Option | Tradeoff | Decision |
|---|---|---|
| R2 now | 10 GB free tier but binding entitlement ambiguous (research L2); worst case $5/mo | Deferred — verify empirically in user account first |
| KV / D1 BLOBs / IndexedDB | 25 MiB / 2 MB caps; device-bound | Deferred |
| **StorageAdapter interface, unimplemented** | Zero cost now; byte storage lands in document-library change | **Accepted** — interface ships in `src/lib/server/storage/types.ts`; metadata tables in D1 either way |

## Data Flow

```
+------------------+     +----------------+     +---------------+     +-----+
| Browser (SSR)    | --> | hooks.server.ts| --> | load / action | --> | D1  |
| use:enhance      | <-- | (HMAC gate)    | <-- | repository    | <-- |     |
+------------------+     +----------------+     +---------------+     +-----+
```

### Sequence: login flow
```
Browser        hooks.server.ts         login/+page.server.ts        auth/            D1
  │ POST /login?/login (password)            │                        │               │
  │─────────────────────────────────────────▶│ path=/login exempt     │               │
  │                                          │── rateLimit.check(ip)─▶│── SELECT ────▶│
  │                                          │── verifyPassword ─────▶│               │
  │                                          │                        │ PBKDF2 15k    │
  │                                          │◀─ ok / fail ───────────│               │
  │                                          │ fail → generic error   │               │
  │                                          │ ok → session.sign()    │               │
  │◀─ 303 / + Set-Cookie st_session ────────│                        │               │
  │ GET / (cookie)                            │── verify cookie ──────│ HMAC ok       │
  │◀─ data routes proceed ──────────────────▶│                        │               │
```

### Sequence: task completion with recurrence advance
```
Browser     hooks (HMAC ok)      +page.server.ts action        repository        D1
  │ POST /?/complete(id)                │                          │               │
  │────────────────────────────────────▶│── completeTask ─────────▶│── SELECT ────▶│
  │                                     │ occ=max(next_due,today)  │               │
  │                                     │ INSERT completion(occ) ──│── INSERT ────▶│
  │                                     │ next=advance(rule,occ)   │               │
  │                                     │ UPDATE next_due=next ────│── UPDATE ────▶│
  │◀─ {ok}; use:enhance revalidates ────│                          │               │
  │ GET / → list join shows next occurrence (done=0)               │               │
```

### Sequence: load-time materialization
```
Browser     hooks (HMAC ok)     +page.server.ts load        repository.listTasks      D1
  │ GET /                             │                          │                    │
  │──────────────────────────────────▶│─────────────────────────▶│── SELECT page ────▶│
  │                                   │ stale: next_due<today && │ (LIMIT 25, idx)   │
  │                                   │ mode='++'                │                    │
  │                                   │ per stale: materialize() │── UPDATE ─────────▶│
  │                                   │ (≤1 UPDATE each, ≤25)    │  (idempotent)     │
  │◀─ props {tasks, done, history} ───│                          │                    │
```

## File Changes

| File | Action | Description |
|---|---|---|
| `wrangler.jsonc` | Modify | Add `d1_databases` binding (`DB`) |
| `src/app.d.ts` | Modify | Augment global `Env` with `SESSION_SECRET`, `PASSWORD_HASH` (survives `wrangler types` regen) |
| `migrations/0001_init.sql` | Create | `tasks`, `task_completions`, `login_attempts` + indexes |
| `.gitignore` | Modify | Add `.dev.vars` |
| `.dev.vars` | Create (local, gitignored) | Dev secrets |
| `src/hooks.server.ts` | Create | Auth gate (fail-closed) |
| `src/routes/login/+page.server.ts` | Create | Login action: rate limit, PBKDF2 verify, cookie issue |
| `src/routes/login/+page.svelte` | Create | Login form (Spanish UI) |
| `src/routes/logout/+server.ts` | Create | POST logout: destroy cookie |
| `src/routes/+layout.svelte` | Modify | App shell: 4-module nav (Tareas, Calendario, Documentos, Estudio) |
| `src/routes/+page.server.ts` | Create | Tasks load + actions (create/edit/delete/complete/uncomplete) |
| `src/routes/+page.svelte` | Modify | Tasks UI (form + list + history) |
| `src/routes/{calendar,documents,study}/+page.svelte` | Create | Placeholders |
| `src/lib/domain/recurrence.ts` | Create | Pure advance/materialize/date math (no runes) |
| `src/lib/server/auth/password.ts` | Create | PBKDF2 hash/verify (env format `pbkdf2$sha256$15000$salt$hash`) |
| `src/lib/server/auth/session.ts` | Create | HMAC sign/verify + cookie options |
| `src/lib/server/auth/rate-limit.ts` | Create | D1-backed attempt limiter |
| `src/lib/server/tasks/repository.ts` | Create | D1 queries (list/get/create/update/delete/complete/history) |
| `src/lib/server/storage/types.ts` | Create | `StorageAdapter` interface (unimplemented) |
| `src/lib/components/` | Create | `TaskForm.svelte`, `TaskItem.svelte`, `TaskList.svelte` |
| `package.json` | Modify | Add `@cloudflare/vitest-pool-workers` |
| `vite.config.ts` | Modify | Vitest projects: jsdom (unit/component) + pool-workers (D1 integration) |

## Interfaces / Contracts

```sql
-- migrations/0001_init.sql
CREATE TABLE tasks (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  created_at       TEXT NOT NULL,             -- ISO-8601 UTC
  next_due         TEXT NOT NULL,             -- YYYY-MM-DD, recurrence cursor
  recurrence_type  TEXT,                      -- NULL | 'daily' | 'weekly' | 'monthly'
  recurrence_dow   INTEGER,                   -- 1-7 ISO (weekly only)
  recurrence_dom   INTEGER,                   -- 1-31, clamped to month end (monthly only)
  recurrence_mode  TEXT NOT NULL DEFAULT '++' CHECK (recurrence_mode IN ('++','.+')),
  recurrence_anchor TEXT                      -- start date seed
);
CREATE INDEX idx_tasks_next_due ON tasks(next_due);

CREATE TABLE task_completions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,              -- YYYY-MM-DD
  completed_at    TEXT NOT NULL,              -- ISO-8601 UTC
  UNIQUE(task_id, occurrence_date)            -- idempotent completion + join index
);

CREATE TABLE login_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ip           TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts(ip, attempted_at);
```

Bounded list read (single query, no N+1): `SELECT t.*, tc.occurrence_date IS NOT NULL AS done FROM tasks t LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.occurrence_date = t.next_due ORDER BY t.next_due ASC LIMIT ?` (page 25 → ≤26 queries/invocation incl. materialization).

```ts
// src/lib/server/storage/types.ts — deferred implementation (document-library change)
export interface StorageAdapter {
	put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
	delete(key: string): Promise<void>;
	list(prefix: string): Promise<string[]>;
}
```

Session cookie: name `st_session`; `httpOnly`, `secure` (false in dev), `sameSite: 'lax'`, `path: '/'`, max-age 30 days; payload `{v:1, ts}` base64url + `.` + HMAC-SHA256 (verified with `crypto.subtle.verify`). Gate: exempt only `/login`; missing secret or invalid/tampered cookie → `redirect(303, '/login')`, never serve data. `today()` uses `Intl.DateTimeFormat` with `timeZone: 'America/Argentina/Buenos_Aires'` (injectable, pure).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (jsdom) | `recurrence.ts` advance/materialize: daily/weekly/monthly, clamping 29–31, leap years, skip-to-future, idempotency; `password.ts` hash format/verify; `session.ts` sign/verify/tamper; rate-limit window | Plain vitest, no runes |
| Integration (vitest-pool-workers) | Repository against local D1 (migrations applied): CRUD, completion insert+advance, uncomplete deletes latest log row, load materialization idempotent, bounded list, CASCADE cleanup; auth gate: no cookie / tampered cookie → redirect, missing secret fails closed, login correct/wrong password | `@cloudflare/vitest-pool-workers`, injected `DB` binding |
| Component (@testing-library/svelte) | Login form, task list render, shell nav, Spanish labels | jsdom |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary (the auth gate is HTTP-level SvelteKit routing, out of the matrix's domain). Security-critical behaviors are covered by integration tests above (fail-closed gate, cookie tampering, missing secret).

## Migration / Rollout

- Provision D1: `wrangler d1 create sistema-tareas` (or dashboard), paste `database_id` into `wrangler.jsonc`; apply `wrangler d1 migrations apply sistema-tareas --local|--remote`. Pages deploy does not auto-run migrations — apply before first deploy (add to deploy notes).
- Chained PRs (400-line budget, exploration forecast): slice 1 = infra (wrangler/D1/migration/types) + auth + shell + placeholders; slice 2 = quick-tasks module. Slice 2 depends on slice 1.
- Rollback: revert feature PR (skeleton restored, no data exposed); schema additive; 7-day D1 Time Travel or `wrangler d1 export` snapshot for bad migrations.
- No data migration (fresh schema).

## Open Questions

- None blocking. Decided defaults to confirm during apply: PBKDF2 iterations 15,000 (spec range 10k–25k); rate limit 5 attempts/15 min/IP; cookie max-age 30 days; local TZ for `today()` (America/Argentina/Buenos_Aires).