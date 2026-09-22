## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, sveltekit-adapter

---

# AGENTS.md

## Project state

- This repository is a **fresh copy of the "Estructura" workflow template** (see `README.md` and `.github/WORKFLOW.md`). There is **no application code yet**: no `src/`, no manifests, no build. Do not search for app entrypoints or try to run/test an app.
- Planned product: a personal organizer combining **quick tasks** (boolean done/not-done), **calendar objectives** (exams, deadlines), a **document library** (original PDF/DOC files), and **study pages** organized as `subject → topic → main ideas` with per-topic completion progress (topic is 100% when all its ideas are checked).
- Current goal: get **CI/CD working and deploying to the cloud with mostly free tooling** before building the app. `scripts/ci.sh` is the single CI entry point.

## Gotchas

- `scripts/ci.sh` **fails by design** until it is configured (see its comments). Do not delete the failure path without defining real checks — a silently green CI is worse than a failing one.
- The git `origin` remote still points to the template repo `BlancoCavallero/Estructura.git`. Pushing will target that repo until the remote is re-pointed to this project's own repository.
- Local checkout only has `main` (plus a stale template branch); `develop` exists on the remote but is not checked out locally.
- `.atl/` is local tooling state — gitignored, never versioned.

## Workflow (enforced by `.github/workflows/branch-policy.yml`)

- Working branches: `feature/*`, `fix/*`, `refactor/*`, `docs/*`, `test/*`, `chore/*`, `hotfix/*`.
- Working branches target `develop` — never merge directly into `main`.
- `main` only accepts `develop → main` promotions or `hotfix/*` (a hotfix must also be propagated to `develop`).
- Commits use Conventional Commits with scope, e.g. `docs(workflow): ...`, `chore(template): ...`.
- Meaningful changes trace to an Issue (see `.github/ISSUE_TEMPLATE/`).

## Commands

- No build/test/lint commands exist yet. CI only runs `./scripts/ci.sh` via `.github/workflows/ci.yml`.

## References

- `.github/WORKFLOW.md` — full workflow definition (branching, quality gates, review, releases).
- `README.md` — template setup instructions (branch protection, CODEOWNERS).