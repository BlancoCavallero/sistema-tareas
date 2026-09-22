# Tasks: CI/CD + Free-Tier Cloud Hosting Setup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 (excl. generated lockfile) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR to `develop` (skeleton+ci.sh inseparable; deploy+docs along) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Bootstrap + protection | Not a PR (local + GitHub UI) | `git remote get-url origin` != template | gh CLI + GitHub UI | `git remote set-url origin <template>` (pre-first-push) |
| 2 | Skeleton + CI + deploy + docs | PR 1 → develop | `./scripts/ci.sh` green | GitHub Actions CI | Revert PR; remove `deploy.yml`; delete Pages project |

## Phase 1: Repository Bootstrap

- [x] 1.1 `gh repo create sistema-tareas --public --source . --push` (public repo, pushes branch)
- [x] 1.2 Re-assert origin: `git remote set-url origin https://github.com/<user>/sistema-tareas.git`
- [x] 1.3 `git fetch origin` (remote has `develop`)
- [x] 1.4 `git checkout develop` (local tracking branch)
- [x] 1.5 RED (push state): assert `git remote get-url origin` != `https://github.com/BlancoCavallero/Estructura.git` before any later push

## Phase 2: Branch Protection

> Applied via `gh api` in batch apply-002 with explicit orchestrator consent
> (repo `BlancoCavallero/sistema-tareas`; both branches verified unprotected
> before applying). Same rule on both branches: require PR, 1 approval,
> required status checks `CI` + `Branch Policy` (strict), enforce_admins,
> no force push/delete.

- [x] 2.1 GitHub UI `main`: require PR, 1 approval (or CI-only), checks `CI` + `Branch Policy`, no force push/delete
      — Evidence: `gh api -X PUT repos/BlancoCavallero/sistema-tareas/branches/main/protection` (HTTP 200); GET verify: strict=true, contexts=[CI, Branch Policy], approving_count=1, enforce_admins=true, force_pushes=false, deletions=false
- [x] 2.2 GitHub UI `develop`: same rule
      — Evidence: same PUT on `branches/develop/protection` (HTTP 200); GET verify: strict=true, contexts=[CI, Branch Policy], approving_count=1, enforce_admins=true, force_pushes=false, deletions=false

## Phase 3: SvelteKit Skeleton

- [x] 3.1 Scaffold `npx sv create` (minimal+TS+Cloudflare adapter) → `package.json`, `svelte.config.js`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.nvmrc`, `src/`
- [x] 3.2 Add `wrangler@3` devDependency (v3 pin: `wrangler pages deploy` deprecated in v4)
- [x] 3.3 `src/app.html`: set `lang="es"`
- [x] 3.4 `src/routes/+page.svelte`: render `<h1>Sistema de Tareas</h1>` (Spanish UI)
- [x] 3.5 `.gitignore`: add `.svelte-kit/`, `.wrangler/`
- [x] 3.6 Vitest + @testing-library/svelte; `src/routes/+page.test.ts` asserts Spanish text

## Phase 4: CI Script

- [x] 4.1 RED (git repo selection): origin guard in `scripts/ci.sh` — exit 1 with `::error::origin still points at template` when origin == template; prove in scratch clone `/tmp/ci-red-origin` (read-only) of template repo: fires pre-npm
- [x] 4.2 GREEN: `scripts/ci.sh` = `set -euo pipefail`; `npm ci && npm run lint && npm run test && npm run build`, fail on first error

## Phase 5: Deploy Workflow

- [x] 5.1 Create `.github/workflows/deploy.yml`: `on: push -> main` only; checkout@v4, setup-node@v4 (`.nvmrc`, npm cache), `npm ci`, `npm run build`
- [x] 5.2 Deploy step: `npx wrangler pages deploy .svelte-kit/cloudflare --project-name sistema-tareas --branch main` (local pinned `wrangler@3` devDep, no fresh download); env `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (secrets)

## Phase 6: Docs & Config

- [x] 6.1 `README.md`: repo creation, origin re-point, branch protection, Pages project + API token
- [x] 6.2 `.github/WORKFLOW.md`: same setup steps (protection §25)
- [x] 6.3 `openspec/config.yaml`: record SvelteKit/TS/adapter-cloudflare/Pages stack; `testing.projects` root; `test_command`
- [x] 6.4 Self-check: `./scripts/ci.sh` green, `deploy.yml` present, origin != template

---

## Apply Notes (batch apply-001)

- sv 0.17 scaffolds config inside `vite.config.ts` (no `svelte.config.js`); generated `.prettierrc` as `prettier.config.js` and no `.nvmrc` — `.nvmrc` created with Node 22.
- Task 3.2 pin: `wrangler@3.114.17`. `@sveltejs/adapter-cloudflare@7` peers `wrangler@^4`, so the adapter was pinned to `6.0.1` (peers `^3.87.0 || ^4.0.0`) to keep the mandatory v3 pin. `wrangler types --check` does not exist in v3; build/check scripts use `wrangler types` instead, and generated `worker-configuration.d.ts` is gitignored.
- Task 3.6 deviation: SvelteKit's route manifest rejects any `+`-prefixed file under `src/routes/` ("Files prefixed with + are reserved"); the test lives at `src/routes/page.test.ts` (same dir, imports `+page.svelte`).
- Task 3.6 setup: vitest addon's browser mode was replaced with jsdom + `@testing-library/svelte` via the `svelteTesting()` plugin (browser resolve condition), per the official Svelte testing setup.
- CI-red proof (4.1): scratch clone `/tmp/ci-red-origin` → `./scripts/ci.sh` exits 1 with `::error::origin still points at template` before any npm activity.
- GREEN proof (4.2, 6.4): `./scripts/ci.sh` exits 0 (npm ci → lint → test → build) in the re-pointed repo.
- openspec/ and AGENTS.md stay untracked (attempt scope); they are prettier-ignored.
- Phase 2 (2.1, 2.2) executed in batch apply-002 via `gh api` (explicit orchestrator consent); both branches verified protected with the required rules. No source files touched.