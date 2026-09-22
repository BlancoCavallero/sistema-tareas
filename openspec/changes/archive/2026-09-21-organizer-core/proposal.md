# Proposal: organizer-core

## Intent

Foundation for the organizer on Cloudflare free tier: D1 persistence, single-password auth (public *.pages.dev), app shell, and the quick-tasks slice proving patterns later modules reuse.

## Scope

### In Scope

- D1: create DB, `d1_databases` binding, `wrangler types`, foundational migration (`tasks`, `task_completions`).
- Auth: `hooks.server.ts` gate + login page; PBKDF2 (WebCrypto, ~10k–25k) + HMAC cookie (secret via Pages env var).
- App shell: 4-module nav; placeholders for calendar/documents/study.
- Quick tasks: CRUD + completion history for EVERY task + recurrence (daily/weekly/monthly; `++` default; next occurrence on completion/load, no cron); progress derived, never stored.

### Out of Scope

- Document bytes/upload: deferred behind `StorageAdapter` interface (R2 binding unverified).
- Calendar objectives, study pages (follow-up changes).
- localStorage/offline sync; Cloudflare Access; client-side pre-hashing.

## Capabilities

### New Capabilities

- `user-auth`: single-password login/logout, PBKDF2 verification, HMAC cookie, route gate.
- `quick-tasks`: CRUD, completion toggle, completion-history log, recurrence, derived progress.

### Modified Capabilities

None — `openspec/specs/` empty.

## Approach

D1 single source of truth; indexed, bounded reads. Form actions + `use:enhance` for mutations; runes discipline (load → props; `$derived`; class stores). PBKDF2 once per login; HMAC verifies sessions (10 ms CPU budget). Recurrence via `tasks` + `task_completions` log.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `wrangler.jsonc`, `src/app.d.ts` | Modified | D1 binding; Env DB/secrets |
| `src/hooks.server.ts` | New | Auth gate |
| `src/routes/`, `src/lib/` | New | login, shell, tasks; domain, repo |
| `migrations/` | New | foundational schema |
| `package.json` | Modified | D1 test tooling |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| D1 hard caps brick app until UTC reset | Low | Indexed, bounded reads |
| PBKDF2 below OWASP minimums | Med | Record in design; rate-limit login |
| Public URL exposed pre-auth | Low | Gate ships before data routes |
| Runes SSR leakage | Low | load → props discipline |
| ~500–700 lines > 400-line budget | High | Chained PRs: infra+auth+shell, then tasks (ask-on-risk) |
| Secret in git | Low | Pages env var only |

## Rollback Plan

- Regression: revert feature PR → skeleton restored, no data exposed.
- Bad migration: restore via 7-day D1 Time Travel or `wrangler d1 export` snapshot.
- Broken tasks slice: re-deploy prior merge; schema additive, data preserved.

## Dependencies

- D1 DB provisioning (dashboard vs wrangler CLI).
- Pages env var for signing secret.
- No new runtime deps.

## Success Criteria

- [ ] Unauthenticated data access blocked (tested).
- [ ] Task CRUD + completion toggle on D1; per-task history; next occurrence materialized.
- [ ] CI green; live at sistema-tareas.pages.dev.