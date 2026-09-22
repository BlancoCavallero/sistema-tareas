# Apply Progress — ci-cd-hosting-setup

- **Batch**: apply-002 (Phase 2: Branch Protection)
- **Date**: 2026-09-22
- **Mode**: Standard (strict_tdd: false per `openspec/config.yaml`)
- **Attempt ledger**: request-id `apply-002-branch-protection`, work-unit `phase2-branch-protection`, state `proceed`, max-attempts 1, max-changed-lines 50

## Scope

Enable GitHub branch protection with the exact rules from the spec (`Branch
Protection Policy` requirement) and design (Review policy decision) on `main`
and `develop` of `BlancoCavallero/sistema-tareas`, programmatically via
`gh api` (explicit orchestrator consent; no source files touched).

## Applied Configuration (identical on both branches)

| Setting | Value |
|---|---|
| required_status_checks.strict | `true` |
| required_status_checks.contexts | `["CI", "Branch Policy"]` |
| required_pull_request_reviews.required_approving_review_count | `1` |
| required_pull_request_reviews.dismiss_stale_reviews | `true` |
| required_pull_request_reviews.require_code_owner_reviews | `false` |
| enforce_admins | `true` |
| allow_force_pushes | `false` |
| allow_deletions | `false` |
| required_linear_history | `false` |
| required_conversation_resolution | `false` |
| restrictions | `null` |

Note: spec says "one required approval or CI-only status checks"; the applied
rule is the stricter combination (1 approval AND CI + Branch Policy checks),
matching the design's review policy. `dismiss_stale_reviews` is not specified
in the spec; set to GitHub's recommended `true`.

## Commands Used

Baseline (both branches, before applying):

```
gh api repos/BlancoCavallero/sistema-tareas/branches/main/protection    # HTTP 404 "Branch not protected"
gh api repos/BlancoCavallero/sistema-tareas/branches/develop/protection # HTTP 404 "Branch not protected"
```

Apply (payload at `/tmp/opencode/branch-protection.json`):

```
gh api -X PUT repos/BlancoCavallero/sistema-tareas/branches/main/protection --input /tmp/opencode/branch-protection.json    # HTTP 200
gh api -X PUT repos/BlancoCavallero/sistema-tareas/branches/develop/protection --input /tmp/opencode/branch-protection.json # HTTP 200
```

Verify (field-level assertions with jq over GET responses):

```
gh api repos/BlancoCavallero/sistema-tareas/branches/{main,develop}/protection
```

## Verification Output

Both branches PASS all 7 assertions each (14/14 total):

| Assertion | main | develop |
|---|---|---|
| strict = true | PASS | PASS |
| contexts contain `CI` and `Branch Policy` | PASS | PASS |
| required_approving_review_count = 1 | PASS | PASS |
| dismiss_stale_reviews = true | PASS | PASS |
| enforce_admins = true | PASS | PASS |
| allow_force_pushes = false | PASS | PASS |
| allow_deletions = false | PASS | PASS |

Raw GET responses retained at `/tmp/opencode/protection-main.json` and
`/tmp/opencode/protection-develop.json` (evidence revision input).

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `gh api repos/BlancoCavallero/sistema-tareas/branches/{main,develop}/protection` piped to `jq -e` assertions — 14/14 PASS (see table above) |
| Runtime harness command/scenario and exact result | `gh api -X PUT .../branches/{main,develop}/protection` against live GitHub API — HTTP 200 with expected payload echoed back for both branches |
| Rollback boundary | GitHub UI: Settings → Branches → delete/edit the `main` and `develop` rules; or `gh api -X DELETE repos/BlancoCavallero/sistema-tareas/branches/{main,develop}/protection`. Reverts protection only — no source code involved; `tasks.md`/`apply-progress.md` edits revert independently (openspec/ is untracked). |

## Task Completion (tasks.md)

- [x] 2.1 `main` protection (PR required, 1 approval, checks `CI` + `Branch Policy`, no force push/delete)
- [x] 2.2 `develop` protection (same rule)

## Remaining State

- All 21/21 tasks complete. No source files created or modified in this batch.
- `apply-progress.md` is a new artifact (this file); verify-report still missing.
- Next phase: sdd-verify (final verification once orchestrator routes it).

## Deviations

- Tasks text said "GitHub UI"; executed via `gh api` per orchestrator instruction
  (explicit consent supersedes the earlier manual-only note in tasks.md).
- `dismiss_stale_reviews` set to `true` (spec silent; GitHub recommended default).