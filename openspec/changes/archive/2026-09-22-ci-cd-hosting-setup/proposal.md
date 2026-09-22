# Proposal: CI/CD + Free-Tier Cloud Hosting Setup

## Intent

The repo is a fresh template copy: no app code, `scripts/ci.sh` fails by design, no deploy path, `origin` points at the template repo. This change builds the foundation: real public repo, working CI, Cloudflare Pages deployment.

## Scope

### In Scope
- Repo bootstrap (FIRST task): create public repo, re-point `origin`, checkout `develop`
- Branch protection main/develop: 1 approval or CI-only (documented steps)
- Stack skeleton: SvelteKit + TS + adapter-cloudflare hello-world, Spanish UI
- Real `scripts/ci.sh`: deps → lint → test → build
- `deploy.yml`: Cloudflare Pages on merge to main
- Docs: README/.github/WORKFLOW.md setup steps

### Out of Scope
- Product features (tasks, calendar, document library, study pages)
- D1 schema, R2 bindings, auth implementation
- Custom domain, staging deploys

## Capabilities

### New Capabilities
- `ci-cd-pipeline`: CI validation chain + deploy-on-merge + branch protection policy

### Modified Capabilities
None.

## Confirmed Decisions

| # | Decision | Value |
|---|----------|-------|
| 1 | Repo visibility | Public; data in D1/R2, never git |
| 2 | Hosting | Cloudflare Workers/Pages + D1 + R2, $0 |
| 3 | Framework | SvelteKit + TS, adapter-cloudflare |
| 4 | Review policy | 1 approval or CI-only |
| 5 | Auth | Single password + signed session cookie |
| 6 | Domain | `*.pages.dev` |
| 7 | App UI | Spanish |
| 8 | Repo bootstrap | First task of this change |

Evidence: `openspec/changes/ci-cd-hosting-setup/exploration.md` (2026-09-21).

## Approach

Cloudflare all-free stack per exploration. `ci.yml` stays the PR gate, running real `scripts/ci.sh`. New `deploy.yml` (push to main) runs `wrangler pages deploy` — deploy logic versioned in-repo, instant dashboard rollback. Bootstrap first, then branch protection per documented steps.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/ci.sh` | Modified | Real checks: deps → lint → test → build |
| `.github/workflows/ci.yml` | Modified | Runs new ci.sh |
| `.github/workflows/deploy.yml` | New | Deploy on push to main |
| `.github/workflows/branch-policy.yml` | Unchanged | Second gate |
| `README.md`, `.github/WORKFLOW.md` | Modified | Setup steps |
| `openspec/config.yaml` | Modified | Stack/testing context |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Push to template repo before re-point | High | Bootstrap is first task |
| Branch protection manual config | Med | Documented steps; CI still gates |
| Cloudflare token/setup friction | Med | Auth steps in WORKFLOW.md |
| Free-tier hard caps (D1, 10ms CPU) | Low | No DB/compute in scope |

## Rollback Plan

- Origin: `git remote set-url origin <old>` (valid before first push only).
- CI: revert `scripts/ci.sh`; ci.yml stays the gate.
- Deploy: remove `deploy.yml`; delete Pages project (old deployments kept).
- Protection: revert in GitHub UI.

## Dependencies

- GitHub + Cloudflare free accounts; Pages project + API token

## Success Criteria

- [ ] `scripts/ci.sh` green on PR to develop/main
- [ ] Main merge deploys live `*.pages.dev`
- [ ] `origin` re-pointed; `develop` checked out
- [ ] Branch protection active (1 approval or CI-only)
- [ ] SvelteKit skeleton renders Spanish UI