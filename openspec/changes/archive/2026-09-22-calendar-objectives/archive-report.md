# Archive Report: calendar-objectives

- Phase: `sdd-archive`
- Date: 2026-09-22
- Change name: `calendar-objectives`
- Artifact store: openspec (repo-local) + engram topic `sdd/calendar-objectives/archive-report`
- Archive path: `openspec/changes/archive/2026-09-22-calendar-objectives/`
- Verdict: **CLOSED** — implementation complete and verified on the stacked branch head; delivery PRs pending merge at archive time.

## Final State (at close)

Highest-rank sources: the persisted tasks artifact (24/24 `[x]`) and the orchestrator's final-state facts (launch prompt, most recent account). Intermediate snapshots (`apply-progress` #153, `verify-report` #155) are cited below only where they describe their time, per Final-State Authority.

- **Implementation**: All 6 chained PRs built and verified on the stacked branch head `feature/calendar-objectives-pr6-grid` @ `b6cc1de`. Slices: PR1 schema+domain (`feature/calendar-objectives-pr1-schema-domain`, PR #8, commits `95962c5`/`fe65f42`); PR2 store+repo (`feature/calendar-objectives-pr2-store-repo`, PR #9, `b589fc4`/`6c80e72`); PR3 tokens (`feature/calendar-objectives-pr3-tokens`, PR #10, `5d87703`); PR4 route+form (`feature/calendar-objectives-pr4-route-form`, PR #11, `1b3eaa4`/`44f8cad`); PR5 lists+item (`feature/calendar-objectives-pr5-lists-item`, PR #12, `037b65b`/`0d3e900`); PR6 grid (`feature/calendar-objectives-pr6-grid`, PR #13, `d0ebd51`/`b6cc1de`).
- **Delivery**: The 6 chained PRs (PRs #8–#13) are created on GitHub, all based on `develop`, **NOT yet merged at archive time** — merge remains a delivery step after this archive. Delivery strategy was `ask-on-risk` resolved to CHAINED, `chain_strategy=stacked-to-main`.
- **Tests**: Full suite 130/130 passed (`npm run test`, 12 files, exit 0, hash `sha256:818578de…7458`); `npm run lint` clean (exit 0, hash `69f1cb35…`); `npm run check` 0 errors / 0 warnings (exit 0, hash `70f89f93…`); `npm run build` exit 0 (wrangler types + vite, adapter-cloudflare, hash `sha256:57415595…41f3e`).
- **Spec compliance**: 12/12 requirements, 21/21 scenarios compliant (calendar-objectives 6 req / 11 scenarios; design-tokens 6 req / 10 scenarios). 11 scenarios runtime-covered, 10 token scenarios verified by static inspection per design scope.
- **Verify findings**: 0 blockers, 0 CRITICAL, 0 WARNING, 3 SUGGESTION-level findings (see Verification Snapshot).

## Task Completion Gate

All 24 implementation tasks are checked `[x]` in the archived `tasks.md` (Phases 1–7: 1.1–1.3, 2.1–2.4, 3.1–3.3, 4.1–4.4, 5.1–5.4, 6.1–6.3, 7.1–7.3). No unchecked implementation tasks; no CRITICAL findings in `verify-report.md`. Gate passed; no stale-checkbox reconciliation was needed. (`apply-progress` #153 at 2026-09-22 12:17 reported Phase 7 pending — that snapshot predates the tasks artifact update at 13:07 and `verify-report` at 13:14; superseded, not echoed.)

## Spec Sync

Both delta specs were new capabilities — `openspec/specs/` held only `quick-tasks` and `user-auth` before this change, so each delta was a full spec (no prior version to merge against).

| Domain | Action | Details |
|--------|--------|---------|
| `calendar-objectives` | Created (full spec) | 6 requirements, 11 scenarios — objective CRUD, manual completion toggle, derived status, list views, month grid, one-off objectives |
| `design-tokens` | Created (full spec) | 6 requirements, 10 scenarios — single global token source, semantic colors light/dark, focus-visible, reduced motion, type/space scales, non-color state cues |

Main specs now live at:
- `openspec/specs/calendar-objectives/spec.md`
- `openspec/specs/design-tokens/spec.md`

Mechanical copy only (`cp` + `diff -r` + `mv`); readback diffs empty (no byte differences). **Destructive delta warning: none** — nothing removed, renamed, or modified in existing specs.

## Verification Snapshot (at verification time, 2026-09-22 13:14)

Per `verify-report.md` (Engram observation #155): verdict **PASS**; blockers 0, critical_findings 0; 24/24 tasks; 12/12 requirements; 21/21 scenarios; evidence revision `sha256:824f12cf…8ada`.

- SUGGESTION 1 (design polish, non-blocking): sub-scale ad-hoc values in two components — chip vertical padding `0.05rem`/`0.1rem` and grid cell `min-height: 5rem` sit below the smallest token step (`--space-1` = 0.25rem). Consider micro spacing tokens or documenting as intentional chip/cell geometry.
- SUGGESTION 2 (hardening, non-blocking): edit action performs no existence check — an edit on a deleted id silently succeeds (0-row UPDATE). Matches the design contract (existence check specified only for toggle/delete); a defensive `fail(404)` is optional.
- SUGGESTION 3 (deploy prerequisite): remote D1 migration apply + `PRAGMA optimize` still pending before deploy; local apply verified (`wrangler d1 migrations list --local` → "No migrations to apply").

## Delivery Notes

`apply-progress` (#153, 2026-09-22 12:17) reported PRs 1–6 complete and stacked; `verify-report` (#155, 13:14) confirms PASS at the pr6 head. Unlike `organizer-core` (whose PRs merged before its archive), the calendar-objectives PRs (#8–#13) were still open and based on `develop` at archive time. Final state per the orchestrator: implementation complete and verified on the stacked branch head; **PRs pending merge** — merge to `develop` and subsequent `develop → main` promotion are delivery steps owned outside this change.

## Archive Notes — Deploy-time Prerequisites (not part of this change)

Recorded for the deploy follow-up, per apply-progress 7.3 and verify-report SUGGESTION 3:

1. **Remote D1 migration**: Pages does not auto-run migrations — apply `wrangler d1 migrations apply sistema-tareas --remote` before deploy, then run `PRAGMA optimize` once. `0002` is additive (`CREATE TABLE objectives` + `CREATE INDEX idx_objectives_due_date`); `0001` untouched.
2. **Deploy env**: reuse the existing Pages env vars from `organizer-core` (`SESSION_SECRET`, `PASSWORD_HASH`) — the `/calendar` route is gated by the same HMAC auth hook; no new vars for this change.

## Traceability (Engram observations read)

| Observation | ID | Topic |
|---|---|---|
| Exploration | #146 | `sdd/calendar-objectives/explore` |
| Research | #147 | `sdd/calendar-objectives/research` |
| Proposal | #148 | `sdd/calendar-objectives/proposal` |
| Spec calendar-objectives | #149 | `sdd/calendar-objectives/spec/calendar-objectives` |
| Spec design-tokens | #150 | `sdd/calendar-objectives/spec/design-tokens` |
| Design | #151 | `sdd/calendar-objectives/design` |
| Tasks | #152 | `sdd/calendar-objectives/tasks` |
| Apply progress | #153 | `sdd/calendar-objectives/apply-progress` |
| Verify report | #155 | `sdd/calendar-objectives/verify-report` |

## SDD Cycle Complete

`calendar-objectives` was fully planned (exploration, research, proposal), specified (2 new capabilities), designed, implemented (24 tasks, 6 chained PRs #8–#13 verified at stacked head `b6cc1de`), verified (PASS, 130/130, 12/12 requirements, 21/21 scenarios), and archived. Remaining delivery: merge PRs #8–#13 to `develop`, then `develop → main` promotion. Ready for the next change.