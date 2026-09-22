# SistemaTareas

Personal organizer: quick tasks, calendar objectives, document library, and study pages. Built with SvelteKit + TypeScript and deployed to Cloudflare Pages.

Current state: CI/CD foundation — SvelteKit skeleton with Spanish UI, real CI chain, and Cloudflare Pages deploy on merge to `main`. Product features are next.

## Stack

- SvelteKit + TypeScript (Svelte 5, runes)
- `@sveltejs/adapter-cloudflare` (build output: `.svelte-kit/cloudflare`)
- Vitest + `@testing-library/svelte` (jsdom)
- ESLint + Prettier
- `wrangler@4` pinned (`wrangler pages deploy` is the current Pages deploy command)
- Hosting: Cloudflare Pages (free tier), deploy on merge to `main`

## Prerequisites

- Node.js (see `.nvmrc`)
- GitHub account with `gh` CLI authenticated (`gh auth login`)
- Cloudflare account

## Repository setup (one-time)

### 1. Create the public repo and re-point `origin`

From a fresh template copy:

```bash
gh repo create sistema-tareas --public --source . --push
git remote set-url origin https://github.com/<user>/sistema-tareas.git
git fetch origin
git checkout develop
```

Never push before `origin` is re-pointed: `scripts/ci.sh` fails with `origin still points at template` while `origin` targets the template repository.

### 2. Branch protection (GitHub UI — cannot be versioned)

For both `main` and `develop`: Settings → Branches → Add branch protection rule:

- Require a pull request before merging (1 approval, or 0 approvals with required status checks for a CI-only solo workflow).
- Require status checks: `CI`, `Validate branch policy`.
- Do not allow force pushes; do not allow deletions.

### 3. Cloudflare Pages project and API token

- Create a Pages project named `sistema-tareas` (no Git integration needed — deploys come from the workflow).
- Create an API token: My Profile → API Tokens → Create Token → use the "Edit Cloudflare Workers" template or a custom token with `Pages:Edit` permission.
- Account ID: `dash.cloudflare.com/<account-id>`.

### 4. GitHub secrets

Settings → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### 5. First deploy

Merge the CI/CD foundation PR into `develop`, then open the `develop` → `main` release PR. Merging to `main` triggers `.github/workflows/deploy.yml`, which publishes to `https://sistema-tareas.pages.dev` (the project's `*.pages.dev` URL).

## Local development

```bash
npm install
npm run dev        # dev server
npm run lint       # prettier --check + eslint
npm run test       # vitest (jsdom)
npm run build      # wrangler types + adapter-cloudflare build
npm run preview    # local preview of the production build
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`) runs `./scripts/ci.sh` on PRs targeting `develop`/`main` and on pushes to those branches: `npm ci` → `npm run lint` → `npm run test` → `npm run build`, failing on the first error.
- **Deploy** (`.github/workflows/deploy.yml`) runs on merge to `main`: build + `wrangler pages deploy` using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
- **Branch Policy** (`.github/workflows/branch-policy.yml`) enforces the working → `develop` → `main` flow.

## Workflow

See [.github/WORKFLOW.md](.github/WORKFLOW.md) for the full definition (branching model, quality gates, review, releases).
