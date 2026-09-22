# Exploration: CI/CD + Free-Tier Cloud Hosting + Stack for SistemaTareas

- Phase: `sdd-explore`
- Date: 2026-09-21
- Change name: `ci-cd-hosting-setup` (**provisional** — proposed by explore; orchestrator should confirm/rename before proposal)
- Artifact store: openspec (repo-local)
- Sources: repo inspection (`git remote -v`, workflows, scripts, openspec/config.yaml) + web research of provider docs/pricing pages, verified 2026-09-21.

---

## Current State

- The repository is a fresh copy of the "Estructura" workflow template. There is **no application code**: no `src/`, no manifests, no build, no test runner.
- CI is `.github/workflows/ci.yml` (runs on PR to `develop`/`main` and push to `develop`/`main`) delegating to `./scripts/ci.sh`, which **fails by design** (placeholder `exit 1`) until real checks are defined.
- `.github/workflows/branch-policy.yml` already enforces the branch flow: working branches (`feature/*|fix/*|refactor/*|docs/*|test/*|chore/*`) → `develop`; `main` only from `develop` or `hotfix/*`.
- `origin` still points to the template repo `BlancoCavallero/Estructura.git`. Local checkout has `main` only; `develop` exists on the remote but is not checked out locally.
- `openspec/config.yaml` exists (`strict_tdd: false`, no test command). No deploy workflow exists — there is no path to production at all today.
- Product vision (from user): (1) CI/CD + mostly-free cloud deploy as FIRST milestone; (2) quick tasks (boolean); (3) calendar objectives (exams/deadlines); (4) document library storing original PDF/DOC files as source of truth; (5) study pages `subject → topic → main ideas` with per-idea "studied" ticks, topic 100% when all ideas ticked, progression generated; study pages reference library documents (not vice versa).

## Affected Areas

- `scripts/ci.sh` — must become the real validation entry point (install deps, lint, test, build) for the chosen stack.
- `.github/workflows/ci.yml` — already wired to gate PRs to `develop`/`main`; may need to run the new checks only (no change in trigger structure required).
- `.github/workflows/deploy.yml` (**new**) — deploy on push to `main` (and optionally preview on PR).
- `.github/workflows/branch-policy.yml` — unchanged; it is the second gate.
- `README.md` / `.github/WORKFLOW.md` — setup steps: re-point origin, create GitHub repo, configure branch protection manually (cannot be versioned).
- `openspec/config.yaml` — testing/stack context to be updated after the stack decision.
- Future application code (SvelteKit app, D1 schema, R2 bindings) — downstream, not part of this exploration's changes.

---

## Approaches

### 1. Hosting providers (free-tier facts, verified 2026-09)

| Provider | Free tier (2026 facts) | Persistent file storage | Cold start | Deploy-on-merge integration | Verdict for this app |
|---|---|---|---|---|---|
| **Cloudflare Workers + Pages + D1 + R2** | Workers: 100k req/day (hard cap, Error 1027), 10 ms CPU/req, 128 MB, 50 subreqs/req, 64 MiB bundle. Pages: 500 builds/mo, 1 concurrent, 20-min timeout, 25 MiB/file, 20k files. D1 (SQLite): 5 GB total, 5M rows read/day, 100k rows written/day — **hard-enforced since 2026-09-01**; 500 MB/DB. R2: 10 GB, 1M Class A + 10M Class B ops/mo, **zero egress**. Request body up to 100 MB. | ✅ R2 (durable, S3-compatible) | **None** (edge, always warm) | Pages Git integration (auto-build, PR previews) or `wrangler deploy` from Actions | **Best fit: $0, durable, single vendor, SQLite-shaped data** |
| **Render** (free web service) | 750 instance hrs/mo, spins down after 15 min idle, cold start 30–60 s, 512 MB RAM / 0.1 CPU, 100 GB bandwidth/mo, 500 build min/mo. Free Postgres: 1 GB, expires after 30 days. No credit card. | ❌ **Ephemeral FS** — uploads/SQLite lost on redeploy/restart/spin-down; persistent disk is paid; free PG expires | 30–60 s (bad UX for daily app) | Auto-deploy from GitHub (push to branch) or deploy hook | ❌ Ephemeral storage kills the document library without external storage; cold starts hurt a daily-use app |
| **Fly.io** | **No free tier for new accounts** (since 2024): free trial = 2 VM hrs or 7 days, then credit card + pay-as-you-go. Legacy Hobby allowances (3× shared-cpu-1x 256 MB + 3 GB volume) are grandfathered only. shared-cpu-1x 256 MB ≈ $2.02/mo; volumes $0.15/GB/mo (snapshots billed from Jan 2026). | ✅ Volumes (persistent) | Minimal (~5–10 s) | `fly deploy` via Actions (token) | ⚠️ Solid, but **not free** anymore for new users |
| **Vercel** (Hobby) | Free: 100 GB bandwidth/mo, serverless functions limits; **no managed DB on free** (storage is separate paid add-on). | Only via external storage (R2/S3/Turso) | Hobby functions cold start | Native Git integration | ⚠️ Works but fragments into 3 vendors (Vercel + Turso + R2); no SQLite story on free |
| **Netlify** | Free: 100 GB bandwidth/mo, 300 build min/mo, functions ~125k invocations/mo | Only via external storage | Functions cold start | Native Git integration | ⚠️ Same fragmentation as Vercel; JS-centric |
| **Railway** | **No free tier** (one-time $5 trial credit). | — | — | — | ❌ Not free |
| **Oracle Cloud Always Free** | ARM Ampere A1: **halved 2026-06-15 to 2 OCPU / 12 GB** (1,500 OCPU-hrs + 9,000 GB-hrs/mo), enforced 2026-08-18 (excess auto-terminated). Plus 2× AMD micro (1/8 OCPU, 1 GB), 200 GB block storage, 10 TB egress/mo, 20 GB object storage. **Idle reclamation**: instances idle 7 days (<20% CPU/net, <20% mem on A1) may be reclaimed. Signup fraud filter rejects many accounts. | ✅ 200 GB block volume + object storage | None (always-on VM) | Any (SSH/Systemd/Docker; Actions SSH action) | ⚠️ Most raw free power, but ops burden (OS/TLS/backups), silent limit cuts, reclamation risk — poor fit for "first milestone, fast win" |
| **GitHub Codespaces** (dev only) | 120 core-hrs/mo (≈60 hrs on 2-core) + 15 GB storage for personal accounts | — | — | — | ✅ Dev environment option, not hosting |
| **GitHub Actions** (CI) | Private repos: 2,000 min/mo, 500 MB artifacts, 10 GB cache. **Public repos: unlimited standard-runner minutes.** | — | — | — | CI cost is a non-issue either way at this scale |

Key cross-cutting facts:
- **GitHub branch protection on private repos requires GitHub Pro** (~$4/mo). On GitHub Free it is available only for **public** repos. The workflow template depends on protected `main`/`develop` → repo visibility is a real decision (see Open Questions).
- Free Postgres tiers (Render, Neon, Supabase) all have sharp edges for a single-user app (expiry, pause-on-inactivity, small storage). SQLite/D1 avoids the whole class of problems.
- Every "container-like" free tier (Render) is ephemeral; every durable free option (R2/D1/OCI volumes) supports the document library. The document library requirement (original files as source of truth, must survive deploys) **rules out ephemeral hosts** without external storage.

### 2. Stack options

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| **A. SvelteKit + TypeScript, adapter-cloudflare (Pages/Workers) + D1 (SQLite) + R2 + Drizzle ORM** | One language; small bundles; first-class Cloudflare support (D1/R2 bindings, typed); SQLite-shaped relational data fits tasks/objectives/subjects-topics-ideas; Drizzle gives local `better-sqlite3` ↔ D1 parity; R2 is S3-compatible (portable later); zero egress; one vendor, $0 | Cloudflare runtime quirks (10 ms CPU/req — no server-side PDF/DOC parsing on free tier); vendor lock-in; smaller ecosystem than Next | Med |
| **B. Next.js + Vercel Hobby + Turso (libSQL) + R2** | Largest ecosystem; familiar to most devs; native Vercel Git deploys | 3 vendors; no free managed DB; Hobby cold starts; heavier | Med |
| **C. FastAPI + React (Vite) + SQLite + R2 on a VM/Node host** | Python backend if user prefers Python; full control | Two codebases; more ops; server needed (OCI/Fly) | High |
| **D. Hono on Workers + D1 + R2 (no framework SSR)** | Minimal, fastest on edge | More manual UI/state work; no SSR ergonomics | Med-High |

### 3. CI/CD flow (how the existing workflow integrates)

1. **PR → develop/main**: `ci.yml` runs `./scripts/ci.sh` (becomes: install deps → lint → test → build) + `branch-policy.yml` validates branch flow. Both must pass before merge (gate before merge — already the template's design).
2. **Push to develop**: CI re-runs (integration validation). Optional later: preview/staging deploy.
3. **develop → main release PR**: same gates.
4. **Merge to main → deploy**: new `.github/workflows/deploy.yml` (push to main) builds and deploys to the provider:
   - Cloudflare: `wrangler pages deploy` (or Pages Git integration auto-build — but explicit deploy workflow keeps deploy logic in-repo and versioned; recommended).
   - Alternative: provider-native Git integration (Render/Netlify/Vercel) — fewer moving parts, but deploy config lives outside the repo.
5. Rollback: Cloudflare Pages keeps previous deployments (instant rollback in dashboard); R2/D1 data is untouched by deploys (data never lives in the repo).

---

## Recommendation

**Hosting: Cloudflare stack (Pages/Workers + D1 + R2), $0/month.** It is the only free tier that is simultaneously durable (R2 survives deploys — required by the document library), always-warm (no 15-min spin-down/cold starts — required by a daily-use personal app), SQLite-shaped (D1 matches the relational domain model), and single-vendor. The 2026 free-tier changes make the alternatives decisively worse: Fly.io no longer has a free tier for new accounts; Render free is ephemeral + cold; Oracle was silently halved and reclaims idle instances.

**Stack: Option A — SvelteKit + TypeScript, adapter-cloudflare, D1 + Drizzle, R2 for documents.** Rationale: single language; the domain is CRUD + forms (Svelte is highly productive there); Drizzle keeps the schema portable between local SQLite and D1; R2's S3 API means the file layer is portable if hosting ever changes. If the user strongly prefers Next.js, Option B is acceptable but costs extra vendors, not extra money.

**Auth: single password + signed session cookie** (argon2/bcrypt hash). Single-user app: no user management, no OAuth, no multi-tenant schema. UI may later add a lock screen; schema stays identical.

**Database: D1 (SQLite)** — correct choice for one user: zero ops, transactional, backups via D1 Time Travel (7 days free) + periodic `wrangler d1 export` to R2. No Postgres needed; free PG tiers are all worse for this use case.

**File storage: R2** — 10 GB free, zero egress, documents stored verbatim (original format = source of truth, never transcoded). Uploads go through a Workers route (request body limit 100 MB on free — fine for PDFs/DOC). Download via R2 public URL or a signed route.

### Domain architecture sketch

```
app (SvelteKit, adapter-cloudflare)
├── quick tasks        tasks(id, title, done BOOLEAN, sort_order, created_at)
├── calendar objectives objectives(id, title, due_date, notes, done)
├── document library   documents(id, name, original_filename, mime_type, size_bytes, r2_key, uploaded_at)
│                        files stored verbatim in R2; DB holds metadata only
├── study pages        subjects(id, name, sort_order)
│                        topics(id, subject_id, name, sort_order, description)
│                        ideas(id, topic_id, text, studied BOOLEAN, sort_order)
│                        topic_completion = derived: studied/total ideas per topic (never stored)
│                        progression = derived per subject (topics 100% → subject %)
└── references         study_documents(idea_id|topic_id, document_id)  -- many-to-many
                         direction: study → document ONLY (library is source of truth,
                         documents know nothing about study pages)
```

Design decisions:
- **Progress is derived, not stored**: recompute on tick; no sync/consistency bugs by construction.
- **Unidirectional reference**: study pages link to documents via a join table; documents carry no back-references (matches the product vision explicitly).
- **Files are content-addressed-ish by R2 key, metadata in D1**; original file bytes are never transformed.
- **Single-user schema**: no `user_id` columns anywhere; auth gates the app, not the data.

---

## Risks

- **GitHub Free private repos lack branch protection** (Pro feature, ~$4/mo). If the repo stays private, the workflow's protected-branch gate cannot be enforced by GitHub; mitigation: public repo (code only — personal data lives in D1/R2, never in git), or GitHub Pro, or relaxed enforcement. Needs user decision (OQ-1).
- **Cloudflare free-tier hard caps**: D1 row limits are hard-enforced since 2026-09-01 (a runaway query bricks the app for the day); 10 ms CPU/req forbids server-side PDF/DOC parsing on the free tier (previews/extraction must be client-side — pdf.js, mammoth.js — or deferred to a later paid/other compute path). Mitigation: indexed queries, client-side previews.
- **Origin remote still points to the template repo** — pushing deploys to the wrong repo until re-pointed; must be fixed before/with the change.
- **Branch protection is manual** (GitHub cannot version it) — the deploy-to-main gate depends on a human configuring it once; document it in the proposal's setup steps.
- **Oracle/Fly paths carry provider-policy risk** (silent tier cuts — Oracle halved ARM in June 2026 without announcement); Cloudflare D1 limits also changed enforcement policy in Sept 2026 — free tiers are moving targets, budget accordingly.
- **Template default of 2 required approvals on `main`** is impractical for a solo developer; should be relaxed (1 or CI-only) — user decision (OQ-4).
- Vendor lock-in to Cloudflare runtime if the app grows beyond 10 ms CPU/request (mitigation: Drizzle + S3 API keep schema and files portable).

---

## Open Questions (user decisions required before proposal)

1. **Repo visibility**: public (free branch protection + unlimited Actions; code only, data stays in D1/R2) vs private (privacy; but GitHub Free lacks branch protection — needs GitHub Pro ~$4/mo or relaxed enforcement)?
2. **Hosting**: Cloudflare all-free stack (recommended) vs Fly.io (~$2–5/mo, classic Node server) vs Oracle Cloud VM (free but ops-heavy + reclamation risk)?
3. **Framework**: SvelteKit (recommended) vs Next.js vs other preference?
4. **Review policy on protected branches**: keep template's 2 approvals on main / 1 on develop, or relax for solo development (e.g., 1 approval, or CI-only with self-merge)?
5. **Auth**: is a single password + session cookie acceptable (no OAuth/multi-user)?
6. **Custom domain**: use a custom domain (free DNS on Cloudflare) or the provider subdomain (`*.pages.dev`)?
7. **App UI language**: English (artifact default) or Spanish UI for the organizer itself?
8. **Repo bootstrap**: who creates the real GitHub repo and re-points `origin` (and checks out `develop`) — before the proposal, or as the first task of the change?

---

## Ready for Proposal

**Yes** — the exploration is complete and the hosting/stack recommendation is evidence-backed (2026-09-21). The orchestrator should present the recommendation and the open questions above to the user before `sdd-propose`. The proposed change name is `ci-cd-hosting-setup`; the proposal scope should be: re-point origin + repo setup, stack skeleton (SvelteKit hello-world with the CI pipeline), real `scripts/ci.sh` checks, deploy workflow to Cloudflare, and documented manual branch-protection setup.