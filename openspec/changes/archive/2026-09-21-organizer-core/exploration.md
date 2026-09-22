# Exploration: organizer-core

- Phase: `sdd-explore`
- Date: 2026-09-21
- Change name: `organizer-core` (proposed by orchestrator)
- Artifact store: openspec (repo-local) + engram topic `sdd/organizer-core/explore`
- Sources: repo inspection (src/, package.json, vite.config.ts, wrangler.jsonc, app.d.ts, workflows, openspec/) + Cloudflare official docs (D1 pricing/limits, R2 pricing/limits, KV limits, Workers limits, Pages wrangler configuration) + Svelte 5 runes docs/articles, verified 2026-09-21.

---

## Current State

- CI/CD is done and validated: `scripts/ci.sh` (npm ci → lint → test → build) gates PRs via `ci.yml`; `deploy.yml` publishes to Cloudflare Pages on merge to `main`; live at https://sistema-tareas.pages.dev. Branch policy + ruleset active.
- App is a bare skeleton: `src/routes/+page.svelte` renders `<h1>Sistema de Tareas</h1>`, `+layout.svelte` (favicon + children), `src/lib/index.ts` (empty), `src/app.d.ts` (Platform.env typed via `wrangler types`). One smoke test at `src/routes/page.test.ts`.
- Stack: SvelteKit 2.63 + Svelte 5.56 (runes **forced** via `vite.config.ts` `runes: () => true`), TS 6, vitest 4 + @testing-library/svelte (jsdom), wrangler 3.114, `@sveltejs/adapter-cloudflare`. Config lives in `vite.config.ts` (no `svelte.config.js`).
- `wrangler.jsonc` has `pages_build_output_dir` only — **no D1/R2/KV bindings exist yet**. `Env` type is currently empty.
- No auth, no data layer, no routes beyond `/`.
- Previous change `ci-cd-hosting-setup` (completed) confirmed: Cloudflare stack ($0), SvelteKit + TS, Spanish UI, single password + signed session cookie, `*.pages.dev` domain, public repo, data never in git. Its exploration already sketched the domain schema (tasks, objectives, documents, subjects→topics→ideas, `study_documents` join) and the rule "progress is derived, never stored".

## Affected Areas

- `wrangler.jsonc` — add `d1_databases` binding (Pages projects bind D1 via the Wrangler file; wrangler ≥ 3.45 required — we have 3.114). This file becomes the source of truth for bindings.
- `src/app.d.ts` — `Env` gains `DB` (auto via `wrangler types`); may gain session/secret env types.
- `src/hooks.server.ts` (**new**) — session-cookie auth gate for all server data access.
- `src/routes/` — new login page, app shell with navigation (4 modules), quick tasks route; placeholder pages for calendar/documents/study.
- `src/lib/` — domain modules (tasks, auth), shared UI components, runes state modules (`.svelte.ts`), repository layer.
- `migrations/` or `wrangler d1 migrations` (**new**) — foundational schema (tasks, objectives; later changes add documents/study tables).
- `package.json` — likely `@cloudflare/vitest-pool-workers` or miniflare-based D1 test setup; no new runtime deps expected for core.
- `scripts/ci.sh` — unchanged (chain already covers test/build); D1 schema checks may be added to CI later.
- `openspec/specs/` — first real domain spec will land here after this change's spec phase.

## Approaches

### 1. Data persistence

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| **A. D1 backend (single source of truth)** | Data survives browser/devices; confirmed free on Workers/Pages Free ("always include the ability to prototype and experiment with D1 for free"); hard caps generous for single-user (5M row reads/day, 100k row writes/day, enforced since 2026-09-01, reset midnight UTC); 5 GB total / 500 MB per DB, 10 DBs; 7-day Time Travel backups; SQLite-shaped schema matches the domain; aligns with prior confirmed decisions; SvelteKit SSR (load + form actions) fits it natively | Needs auth before data exists (public repo + pages.dev URL); hard caps mean a runaway query bricks the app until UTC reset; 50 queries per invocation | Med |
| **B. localStorage-only** | Zero backend, zero cost, no limit risk, offline, instant | Data device/browser-bound; clearing browser data loses the organizer; no backup; contradicts "original files as source of truth" vision; no multi-device | Low |
| **C. Hybrid (D1 + localStorage cache/offline)** | Offline resilience, snappy UI | Two sources of truth → sync/conflict/divergence bugs; directly violates the project's established "derived, never stored" simplicity principle; high effort for solo dev | High |

**Recommendation: A (D1), no localStorage sync in core.** D1 caps are 1–2 orders of magnitude above single-user usage; mitigate the hard-cap risk with indexed queries and bounded list reads (documented in the previous change). Keep the repository layer thin so an offline cache/sync layer can be added later behind the same interface without a rewrite.

### 2. Svelte 5 runes state management

- Server data: return from `load` → pass as props. **Never** put server data in top-level `$state` of a `.svelte.ts` module — SSR leakage across requests (long-lived server process, single user vs. shared state problem), and exporting a reassigned `$state` triggers `state_invalid_export`.
- Client-only shared state: class with `$state` fields exported as `export const store = new Store()` from a `.svelte.ts` file; or `setContext`/`getContext` for request-scoped shared state.
- Derivation: `$derived` (progress %, filtered lists, overdue flags). `$effect` only for side effects (DOM, persistence) — never to derive.
- Mutations: SvelteKit **form actions + `use:enhance`** (progressive enhancement; works without JS; SSR-native; no client/server state duplication). This is the idiomatic CRUD path and minimizes client state.
- Testing: keep domain logic in plain `.ts` modules (no runes) → trivial unit tests; components tested with @testing-library; D1-backed logic tested via injected fake binding or `@cloudflare/vitest-pool-workers`.

### 3. Document file storage (for the later document-library change)

| Approach | Pros | Cons | Complexity |
|---|---|---|---|
| **R2** | 10 GB free tier + 1M Class A / 10M Class B ops + free egress (official pricing); unlimited object size; S3-compatible/portable | **Ambiguous as of Sep 2026**: official Workers pricing omits R2 from free-plan inclusions ("Workers, Pages Functions, Workers KV and Hyperdrive"), and a well-sourced Sep-2026 article claims R2 bucket binding to deployed Workers/Pages requires Workers Paid ($5/mo); official limits docs do not list that restriction | Med |
| **Workers KV** | Confirmed in free plan; 1 GB storage, 1000 writes/day, 25 MiB/value | 25 MiB/value cap (fails for large scans/PDFs); 1 GB total; eventually consistent; designed for config, not file libraries | Low |
| **D1 BLOBs** | Zero extra infra | 2 MB max row size; 500 MB DB — unsuitable for PDF/DOC originals | Low |
| **IndexedDB/localStorage (device-bound)** | Free, works today, no bindings | Data tied to one browser; not a durable library | Low |
| **Static assets via git** | Free, Pages serves them | Committing runtime user uploads to git is wrong (data in git violates confirmed decision); no backup story | Low |

**Recommendation: do not block organizer-core on this.** Define a `StorageAdapter` interface; defer byte storage to the document-library change; verify R2-on-free-plan **empirically in the user's own account** (create bucket, bind, deploy a test) before committing — the ambiguity can only be settled by trying it. Fallbacks: KV (small docs) or device-local + export/import. The document metadata table goes in D1 either way.

### 4. Auth (required before any server data exists)

- Previous confirmed decision: single password + signed session cookie.
- Workers Free **10 ms CPU/request** constraint: bcrypt/argon2 are CPU-heavy and risk blowing the budget; **WebCrypto PBKDF2** (native, fast) with a signed session cookie (HMAC, secret via Pages env var) is the pragmatic fit. Verification runs only at login.
- Cloudflare Access (free ≤ 50 users) would be zero-code auth, but requires a custom domain — not viable on `*.pages.dev` (confirmed decision #6). Rejected; note as an option if a custom domain is ever added.

### 5. One change vs split

**Split.** All 4 modules in one change would be thousands of lines and mix unrelated concerns; the 400-line review budget makes it impossible to review safely. Recommended sequence:

1. **organizer-core (this change)**: D1 setup (create DB, binding in `wrangler.jsonc`, `wrangler types`, foundational migration: `tasks` + `objectives`), single-password auth gate (`hooks.server.ts` + login page + session cookie), app shell with 4-module navigation (placeholders for later modules), **quick tasks** vertical slice (schema → load → form actions → UI → tests). Establishes every pattern the other modules reuse.
2. **calendar-objectives**: objectives CRUD + dates/overdue views (small).
3. **document-library**: metadata schema + storage adapter decision (R2 verification gate) + upload/download/preview (client-side only — 10 ms CPU forbids server-side parsing).
4. **study-pages**: subjects→topics→ideas + derived per-topic completion + subject progression + document references.

Even organizer-core will likely land at ~500–700 authored lines → **forecast chained PRs** (slice 1: infra + auth + shell; slice 2: quick tasks module) against the 400-line budget.

## Recommendation

Build `organizer-core` as: **D1 as the single source of truth** (bind via `wrangler.jsonc`; `tasks` + `objectives` foundational migration), **single-password auth gate with WebCrypto PBKDF2 + signed session cookie** (hooks.server.ts), **SvelteKit form actions + `use:enhance`** as the mutation path, **runes discipline** (server data via `load` → props; `$derived` for all computation; `.svelte.ts` class stores only for client-shared state), and **quick tasks as the first vertical slice** proving the pattern. Documents/study pages ship in later changes; the document byte-storage question is deliberately deferred behind a `StorageAdapter` interface pending empirical R2 verification.

## Risks

- **R2 free-plan ambiguity** (may require $5/mo Workers Paid for production binding; official docs are silent, pricing page omits R2 from free inclusions). Mitigation: storage adapter interface; empirical verification in user account; KV/device fallback.
- **D1 hard daily caps** (5M reads / 100k writes, enforced since 2026-09-01): a runaway query bricks the app until UTC reset. Mitigation: indexed queries, bounded/paginated lists; single-user usage is 1–2 orders of magnitude under the caps.
- **10 ms CPU limit**: password hashing and any document processing must stay within budget — PBKDF2 via WebCrypto (native), client-side previews only. Lower PBKDF2 iteration counts are a security-vs-budget tradeoff to record in the design.
- **Auth is mandatory the moment server data exists** — the site is public at *.pages.dev; without a gate anyone can read/mutate data.
- **Runes SSR leakage** if server data is placed in top-level `$state` in `.svelte.ts` — pattern discipline required (load → props; context for shared).
- **Change size vs 400-line review budget** — organizer-core alone likely exceeds it; plan chained PRs (infra slice → tasks slice); delivery_strategy is ask-on-risk.
- **Secret management**: session cookie signing secret must be a Pages env var (dashboard/deploy secret), never in git; CI needs it for D1 tests if any run in CI.

## Open Questions (user decisions before/at proposal)

1. Is in-app single-password auth (PBKDF2 + signed cookie) acceptable, or is auth out of scope for core (data at risk until added)?
2. Module priority: quick tasks first (recommended) — confirm ordering for follow-up changes.
3. Documents: OK to defer the binary upload path to the document-library change behind a `StorageAdapter` interface?
4. D1 database provisioning: user creates the DB + binding in the dashboard, or wrangler CLI steps in the change (needs account ID)?

## Ready for Proposal

**Yes** — exploration complete; recommendation is evidence-backed (Cloudflare official docs + Svelte 5 docs, 2026-09-21). The orchestrator should present the recommendation and the 4 open questions to the user before `sdd-propose`. Proposed scope: D1 + auth + shell + quick tasks; follow-up changes for calendar, documents, study pages.