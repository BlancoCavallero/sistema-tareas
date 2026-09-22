# Archive Report: dashboard-estudia-shell

- Phase: `sdd-archive`
- Date: 2026-09-22
- Change name: `dashboard-estudia-shell`
- Artifact store: openspec (repo-local)
- Archive path: `openspec/changes/archive/2026-09-22-dashboard-estudia-shell/`
- Verdict: **CLOSED** — implementation complete, verified, and delivered (all 4 PRs merged to `develop`; CI green on each).

## Final State (at close)

Highest-rank sources: the persisted tasks artifact (21/21 `[x]`) and the orchestrator's final-state facts (launch prompt, most recent account). Intermediate snapshots (`apply-progress`, `verify-report`) are cited below only where they describe their time, per Final-State Authority.

- **Implementation**: All 21 tasks complete across 4 chained PRs, all merged to `develop` in order: PR #17 (shell: AppHeader + layout + shell tests), PR #18 (`/tareas` read-only relocation + root load-only), PR #19 (dashboard foundation cards), PR #20 (compact calendar/deadlines/subjects + tokens). PRs #17–#19 were merged after the maintainer relaxed develop branch protection (required reviews removed; checks CI + Validate branch policy kept). Delivery strategy: chained PRs, stacked-to-main.
- **Verification**: `verify-report.md` verdict **PASS** — 15/15 requirements, 26/26 scenarios (22 runtime, 4 CSS-only static per design scope), `./scripts/ci.sh` exit 0, 181/181 tests (19 files), `npm run check` 0 errors / 0 warnings. No CRITICAL or WARNING findings; only SUGGESTION-level (CARD_LIMIT redeclaration, compact-grid sr-only status channel, decorative card-rise animation).
- **Review budget note**: Apply slices PR 3 (514 authored lines) and PR 4 (704 authored lines) exceeded the 400-line review budget; both were accepted as cohesive work units under the established chained-PR precedent, with ledger resets maintainer-authorized.

## Task Completion Gate

All 21 implementation tasks are checked `[x]` in the archived `tasks.md` (Phases 1–5: 1.1–1.3, 2.1–2.4, 3.1–3.10, 4.1–4.3, 5.1). No unchecked implementation tasks; no CRITICAL findings in `verify-report.md`. Gate passed; no stale-checkbox reconciliation was needed.

## Spec Sync

`openspec/specs/` held `calendar-objectives`, `ci-cd-pipeline`, `design-tokens`, `quick-tasks`, and `user-auth` before this change. Two of the three delta specs were new capabilities; one extended an existing spec.

| Domain | Action | Details |
|--------|--------|---------|
| `app-shell` | Created (full spec) | 7 requirements, 12 scenarios — sticky header with brand, primary navigation, active state, responsive nav, logout reachability, standalone login, page titles |
| `dashboard` | Created (full spec) | 7 requirements, 10 scenarios — dashboard home route, greeting/date header, Tareas del día card, mini month grid, próximos vencimientos, Materias entry cards, responsive layout and tokens |
| `quick-tasks` | Updated (delta merged) | 1 requirement, 4 scenarios added — "Task page route" (`/tareas` serves the task list; `/` renders the dashboard; CRUD/completion/recurrence/bounded-read behavior unchanged) |

Main specs now live at:
- `openspec/specs/app-shell/spec.md`
- `openspec/specs/dashboard/spec.md`
- `openspec/specs/quick-tasks/spec.md` (5 requirements, 14 scenarios — 4 pre-existing requirements preserved untouched)

For the two new capabilities: mechanical copy only (`cp` + `diff -r` + `mv`); readback diffs empty (no byte differences). For `quick-tasks`: additive merge only — the delta contained `## ADDED Requirements` with no MODIFIED/REMOVED/RENAMED sections, so the existing 4 requirements were preserved verbatim and the new requirement appended. **Destructive delta warning: none** — nothing removed, renamed, or modified in existing specs.

## Verification Snapshot (at verification time)

Per `verify-report.md` (in this archive): verdict **PASS**; blockers 0, critical_findings 0; 21/21 tasks; 15/15 requirements; 26/26 scenarios; test exit 0 (`sha256:865d924e…4d3f8`); build exit 0 (`sha256:48e416c8…b56888`); evidence revision `sha256:6e7a7343…c3b541a`.

- SUGGESTION 1 (hardening, non-blocking): `UpcomingDeadlinesCard` redeclares `CARD_LIMIT = 25` because `$lib/server` value imports are blocked by `vite-plugin-sveltekit-guard` in client components; the repository's `LIST_LIMIT` stays authoritative for the query.
- SUGGESTION 2 (design, non-blocking): compact grid chips carry sr-only status text as the only chip-status channel (kind label hidden); full grid shows both cues. Acceptable per D9.
- SUGGESTION 3 (polish, non-blocking): the decorative `card-rise` entrance animation collapses under reduced motion via token durations; could be removed outright for the smallest CSS surface.

## Delivery Notes

`apply-progress` (slice PR 4, final) reported 21/21 tasks complete with `./scripts/ci.sh` exit 0 and 181/181 tests at the PR 4 head. Unlike `calendar-objectives` (whose PRs were pending merge at its archive), the dashboard-estudia-shell PRs #17–#20 were **all merged to `develop`** before this archive, with CI green on each; the final-state facts come from the orchestrator's launch prompt (most recent account) and are corroborated by the local `develop` history (`c181296 Merge pull request #20 …`). Remaining delivery: `develop → main` promotion, owned outside this change.

## Traceability

Artifacts archived (openspec files, all byte-identical to the pre-move snapshot per `diff -r`): `proposal.md`, `specs/app-shell/spec.md`, `specs/dashboard/spec.md`, `specs/quick-tasks/spec.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, `.gentle-ai-instance`.

## SDD Cycle Complete

`dashboard-estudia-shell` was fully planned, specified (3 delta specs), designed, implemented (21 tasks, 4 chained PRs #17–#20), verified (PASS, 181/181, 15/15 requirements, 26/26 scenarios), delivered (all 4 PRs merged to `develop`), and archived. Remaining delivery: `develop → main` promotion. Ready for the next change.