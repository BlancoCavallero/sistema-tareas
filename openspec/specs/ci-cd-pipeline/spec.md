# ci-cd-pipeline Specification

## Purpose

Defines the CI/CD foundation for SistemaTareas: repository bootstrap, branch protection, CI validation chain, Cloudflare Pages deploy-on-merge, the SvelteKit skeleton, and setup documentation. Product features, D1 schema, R2 bindings, auth, custom domain, and staging deploys are out of scope.

## Requirements

### Requirement: Repository Bootstrap

The change MUST begin with bootstrap: push to a new public GitHub repository, re-point `origin` from `BlancoCavallero/Estructura.git` to it, and check out `develop` locally. No other task SHALL push to `origin` before re-pointing completes.

#### Scenario: Fresh bootstrap

- GIVEN the repo is a template copy with `origin` at `BlancoCavallero/Estructura.git`
- WHEN the bootstrap task completes
- THEN `origin` points at the new public repository
- AND `develop` is checked out locally

#### Scenario: Re-point failure

- GIVEN `origin` still points at the template repository
- WHEN a push occurs before bootstrap completes
- THEN the push risks targeting the template repository
- AND bootstrap MUST be the first task

### Requirement: Branch Protection Policy

`main` and `develop` MUST be protected in GitHub with one required approval or CI-only status checks. Since branch protection cannot be versioned, the exact steps MUST be documented in `README.md` and `.github/WORKFLOW.md`.

#### Scenario: Protection active

- GIVEN protection is configured on `main` and `develop`
- WHEN a PR targeting either branch is opened
- THEN the PR requires the configured approval or CI checks

#### Scenario: Protection not yet configured

- GIVEN branch protection is not configured
- WHEN a PR targets `main` or `develop`
- THEN the CI and branch-policy workflows still gate the merge

### Requirement: CI Validation Chain

`scripts/ci.sh` MUST run dependency install, lint, test, and build, in order, failing on the first error. CI MUST run it on PRs targeting `develop` or `main` and on pushes to those branches, and MUST gate merges.

#### Scenario: Green PR

- GIVEN a PR targets `develop` or `main`
- WHEN `scripts/ci.sh` passes all checks
- THEN the CI check reports success

#### Scenario: Failing check

- GIVEN a PR targets `develop` or `main`
- WHEN lint, test, or build fails
- THEN the CI job fails
- AND the PR is blocked from merging

### Requirement: Deploy on Merge to main

A deploy workflow MUST deploy the built app to Cloudflare Pages on merge to `main`, via `wrangler pages deploy`. It MUST NOT run on PRs or other branches. Cloudflare Pages MUST retain previous deployments for rollback.

#### Scenario: Main merge deploys

- GIVEN a commit is merged into `main`
- WHEN the workflow succeeds
- THEN the site is live at `*.pages.dev`

#### Scenario: Deploy failure

- GIVEN a commit is merged into `main`
- WHEN the workflow fails
- THEN the previous deployment remains live
- AND rollback is available in the Pages dashboard

### Requirement: SvelteKit Skeleton

The repository MUST contain a SvelteKit + TypeScript skeleton with `adapter-cloudflare` and a default page rendering Spanish UI. It MUST build within the CI chain.

#### Scenario: Skeleton renders

- GIVEN the skeleton is deployed
- WHEN the `*.pages.dev` URL is visited
- THEN the default page renders Spanish UI text

#### Scenario: Skeleton builds

- GIVEN the skeleton is checked out
- WHEN the build step of `scripts/ci.sh` runs
- THEN the `adapter-cloudflare` build completes successfully

### Requirement: Setup Documentation

`README.md` and `.github/WORKFLOW.md` MUST document: creating the public repo and re-pointing `origin`; configuring branch protection; and creating the Cloudflare Pages project and API token.

#### Scenario: Fresh setup follows docs

- GIVEN a developer with repo access
- WHEN they follow the documented setup steps
- THEN branch protection, CI, and deploy are configured as specified

### Requirement: Stack Configuration Context

`openspec/config.yaml` SHOULD record the chosen stack and testing context (SvelteKit + TypeScript, `adapter-cloudflare`, Cloudflare Pages).

#### Scenario: Config reflects stack

- GIVEN the stack is implemented
- WHEN `openspec/config.yaml` is read
- THEN its context records the SvelteKit/Cloudflare stack