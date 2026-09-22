# Archive Report — ci-cd-hosting-setup

- **Change**: ci-cd-hosting-setup
- **Archived on**: 2026-09-22
- **Archived to**: `openspec/changes/archive/2026-09-22-ci-cd-hosting-setup/`
- **Artifact store**: openspec (repo-local)
- **Schema**: gentle-ai.sdd-status v2 — `dependencies.archive: ready`, `nextRecommended: archive`, `blockedReasons: []`

## Cycle Close State (Final-State Authority)

This report records the state of the change AT CLOSE. Per the final-state
authority hierarchy, the persisted tasks artifact and the orchestrator's
explicit final-state facts outrank the intermediate snapshots
(`apply-progress.md`, `verify-report.md`).

### Task Completion Gate

`tasks.md` shows **21/21 tasks complete** (all `[x]`), matching native status
`taskProgress: { total: 21, completed: 21, allComplete: true }`. No unchecked
implementation tasks remain. No archive-time stale-checkbox reconciliation was
required.

### Verification

- `verify-report.md` verdict: **pass_with_warnings** — `gentle-ai.verify-result/v1` envelope:
  - `requirements: 7/7`, `scenarios: 12/12` (11 COMPLIANT + 1 PARTIAL)
  - `blockers: 0`, `critical_findings: 0`
  - `test_command: npm run test` — exit 0, 130/130 passed (12 files)
  - `build_command: npm run build` — exit 0 (adapter-cloudflare)
- **No CRITICAL issues** — the previously failing prettier check on
  `docs/design-reference.md` is remediated; `./scripts/ci.sh` is GREEN (exit 0)
  in the working tree.
- Warnings carried to close (non-blocking, recorded per `verify-report.md`):
  - "Deploy failure" scenario is PARTIAL: deployment retention proven across 3
    successful main deploys and dashboard rollback is platform-documented, but
    no failure was injected and the rollback click-path was not exercised (no
    Cloudflare API credentials; design declared E2E out of scope). A future
    change with Cloudflare API access could close this gap.
  - Task 3.4 literal superseded: `+page.svelte` renders `<h1>Tareas</h1>` +
    TaskList (product features merged on top in later changes), not the literal
    `<h1>Sistema de Tareas</h1>` the task records. Spanish UI requirement
    satisfied in substance and proven at runtime.
- Suggestions carried (non-blocking, for a later change): `npm ci` reports 8
  vulnerabilities (2 low, 2 moderate, 4 high) and a blocked `workerd` install
  script; `docs/` is untracked and prettier-covered — decide whether to commit
  or ignore it.

## Final-State Facts (orchestrator, post-verify-remediation)

The following facts were completed AFTER `verify-report.md` was persisted and
constitute the true final state:

1. **Prettier CRITICAL remediated**: `docs/design-reference.md` (new untracked
   design-reference doc) was formatted with `npx prettier --write`;
   `./scripts/ci.sh` confirmed green (exit 0, lint clean, 130/130 tests, build ok).
2. **README corrected**: line 13 falsely claimed `wrangler pages deploy` is
   deprecated in v4; corrected to `wrangler@4` pinned with
   `wrangler pages deploy` as the current Pages deploy command. Verified against
   installed wrangler 4.136.2 and official Cloudflare docs — `deploy.yml` needs
   NO change (it is canonical v4). Documentation-only remediation; no source change.
3. **Attempt ledger**: a maintainer-authorized reset was executed, then a fresh
   verify acquire/settle completed (`state: complete`) binding the previous
   failed evidence revision via `--remediates-evidence-revision`. No pending
   `decision_required` remains. Native status confirms
   `remediationState: { required: false, complete: false }`.
4. **Branch protection live**: `main` and `develop` both protected via `gh api`
   (contexts CI + Branch Policy, 1 approval, enforce_admins, no force
   push/delete) — verified 14/14 field assertions
   (`apply-progress.md` batch apply-002, re-verified fresh in `verify-report.md`).
5. **Live deploy evidence**: `deploy.yml` ran successfully 3× on main merge
   (runs 35756677167 / 35681630047 / 35668630676, all `completed success`);
   `https://sistema-tareas.pages.dev` is live serving the Spanish UI
   (`lang="es"`, `<h1>Sistema de Tareas</h1>`, HTTP/2, `server: cloudflare`).

## Spec Sync (delta → main specs)

| Domain | Action | Details |
|--------|--------|---------|
| `ci-cd-pipeline` | Created | Main spec did not exist; delta spec is a full spec. Mechanically copied `specs/ci-cd-pipeline/spec.md` → `openspec/specs/ci-cd-pipeline/spec.md` (shell `cp` + temp file + `mv`; byte-identity verified by empty `diff -r`). 7 requirements, 12 scenarios. |

The delta spec contains no ADDED/MODIFIED/REMOVED/RENAMED sections — it is a
complete spec for a new capability (`ci-cd-pipeline`). No requirements were
merged into an existing spec, so no requirements were removed or renamed and no
other domain specs were touched. Config rule `archive: Warn before merging
destructive deltas` does not apply (new spec creation, non-destructive).

## Archive Move

- Source: `openspec/changes/ci-cd-hosting-setup/` → Destination:
  `openspec/changes/archive/2026-09-22-ci-cd-hosting-setup/`
- Mechanical move via shell. `git mv` failed (openspec/ is untracked; git
  reported `fatal: source directory is empty`); the guarded plain `mv` fallback
  ran after a snapshot-vs-source `diff -r` confirmed the source was unchanged.
- Mandatory readback: `diff -r <pre-move snapshot> <archived destination>`
  returned **empty output** (no differences) — passing byte-identity evidence.
- Active `openspec/changes/` no longer contains the change.
- All artifacts archived: `proposal.md`, `specs/ci-cd-pipeline/spec.md`,
  `design.md`, `tasks.md` (21/21), `apply-progress.md`, `verify-report.md`,
  `exploration.md`.

## Notes

- `openspec/config.yaml` context comment still reads "via wrangler@3 on merge
  to main"; the final deployed state pins `wrangler@4.136.2` (post-change
  upgrade commit 56b8f0a). The Stack Configuration Context requirement (SHOULD
  record SvelteKit + TypeScript, `adapter-cloudflare`, Cloudflare Pages) is
  satisfied regardless; the version detail in the context comment is
  informational only and was not a verification failure.
- Working tree left as-is per orchestrator instruction: untracked `openspec/`,
  `docs/`, `AGENTS.md` and modified `README.md` (remediation edit) were NOT
  committed. No source code was modified by this archive phase. No PRs created.