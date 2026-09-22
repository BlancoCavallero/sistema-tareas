# Design: CI/CD + Free-Tier Cloud Hosting Setup

## Technical Approach

Bootstrap the public repo FIRST (re-point `origin`, checkout `develop`); make `scripts/ci.sh` a real SvelteKit chain (deps → lint → test → build); keep `ci.yml` + `branch-policy.yml` as PR gates; add `deploy.yml` so merges to `main` deploy via `wrangler pages deploy` (logic in-repo). Skeleton: SvelteKit + TS + `adapter-cloudflare`, Spanish UI.

## Architecture Decisions

| Decision | Choice | Alternatives / tradeoff | Rationale |
|---|---|---|---|
| Repo visibility | Public | Private (protection needs GitHub Pro) | Free branch protection + Actions; data in D1/R2, never git |
| Hosting | Cloudflare Pages/Workers + D1 + R2 | Railway/Fly/Render/Vercel/Oracle | Only $0 tier that is durable, warm, SQLite-shaped |
| Deploy mechanism | `deploy.yml` + `npx wrangler pages deploy` (devDep) | Pages Git integration (config out-of-repo); wrangler-action | Versioned in-repo, no third-party action, dashboard rollback |
| Framework | SvelteKit + TS, `adapter-cloudflare` | Next.js, Hono, FastAPI+React | Single language, edge-friendly; output dir docs-verified |
| Review policy | 1 approval OR CI-only (manual UI) | Template's 2 approvals on main | Solo dev; CI still gates merges |
| File strategy (future) | Metadata in D1, bytes in R2; originals verbatim (never transcoded); client-side previews (pdf.js/mammoth.js); direct R2 download (zero egress); paginated/lazy lists | Server-side parsing, transcoding, in-app streaming | 10 ms CPU/req forbids server-side parsing; originals = source of truth |

## Data Flow

Bootstrap sequence (exact commands; FIRST task):

```
Dev                gh CLI               GitHub
1. gh repo create sistema-tareas --public --source . --push
   ───────────────────────────────────▶ creates repo, pushes branch
2. git remote set-url origin https://github.com/<user>/sistema-tareas.git
3. git fetch origin            # remote has develop
4. git checkout develop         # creates local tracking branch
5. Verify: origin != https://github.com/BlancoCavallero/Estructura.git
```

PR → CI → merge → deploy:

```
feature/* ──PR──▶ develop ──PR──▶ main ──merge push──▶ deploy.yml
   │ ci.yml + branch-policy        │ ci.yml + branch-policy   │
   └── both green ─────────────▶  both green ────────────────┘
                                                              ▼
                                       wrangler pages deploy .svelte-kit/cloudflare
                                                              ▼
                                                     live *.pages.dev
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/ci.sh` | Modify | Real chain (Contracts); fails if origin points at template |
| `.github/workflows/deploy.yml` | Create | Deploy on merge to `main` (Contracts) |
| `package.json`, `svelte.config.js`, `tsconfig.json`, `vite.config.ts`, `src/app.html`, `src/routes/+layout.svelte`, `src/routes/+page.svelte`, `eslint.config.js`, `.prettierrc`, `.nvmrc` | Create | Skeleton: `sv create` minimal+TS + adapter-cloudflare |
| `.gitignore` | Modify | Add `.svelte-kit/`, `.wrangler/` |
| `README.md`, `.github/WORKFLOW.md` | Modify | Setup: repo creation, origin re-point, protection, Cloudflare token |
| `openspec/config.yaml` | Modify | Record stack; `testing.projects` root; `test_command` set; revisit `strict_tdd` |

## Interfaces / Contracts

`scripts/ci.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
TPL="https://github.com/BlancoCavallero/Estructura.git"
[ "$(git remote get-url origin)" != "$TPL" ] || { echo "::error::origin still points at template"; exit 1; }
npm ci && npm run lint && npm run test && npm run build
```

`deploy.yml`:
```yaml
on: { push: { branches: [main] } }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run build
      - run: npx wrangler pages deploy .svelte-kit/cloudflare --project-name sistema-tareas --branch main
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Branch protection (manual) — `main` and `develop`: Settings → Branches → Add rule: require PR; 1 approval, OR no approvals + required status checks [CI-only]; require `CI` + `Branch Policy`; disable force push and deletion. Lands in README + WORKFLOW §25.

Skeleton page: `src/routes/+page.svelte` renders `<h1>Sistema de Tareas</h1>` (Spanish UI); `src/app.html` `lang="es"`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `+page.svelte` renders Spanish text | Vitest + @testing-library/svelte smoke |
| Integration | `ci.sh` exit codes (lint/test/build/template-origin failures) | ci.yml runs it on every PR/push |
| E2E | Deployed `*.pages.dev` serves UI | Manual smoke in verify (out of scope) |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable docs | — | — |
| Git repo selection | Applicable | Origin guard in `ci.sh` | `ci.sh` exits 1 on template origin |
| Commit state | N/A — no index/worktree ops | — | — |
| Push state | Applicable | Push only after re-point | Bootstrap step 5 asserts origin URL |
| PR commands | N/A — no PR automation; `gh` only creates repo | — | — |

## Migration / Rollout

Phase 1 bootstrap; Phase 2 protection (manual); Phase 3 skeleton + ci.sh + config; Phase 4 deploy.yml + docs. No data migration. Rollback: revert origin (pre-first-push only), `ci.sh`, `deploy.yml` + Pages project; unprotect in UI.

## Open Questions

- None blocking. Inputs: GitHub user/org, Cloudflare account ID + API token, Pages project name.