# Research: organizer-core

- Phase: `sdd-research`
- Date: 2026-09-21
- Change name: `organizer-core`
- Artifact store: openspec (repo-local) + engram topic `sdd/organizer-core/research`
- Artifact type: `gentle-ai.sdd-research/v1`
- Revision: 1
- Outcome: `done` (all 4 selected lanes source-backed; product decisions confirmed by user)
- Questions: (L1) D1 free tier hard caps and Pages binding support; (L2) whether R2 production binding requires Workers Paid; (L3) 10 ms CPU limit and PBKDF2 viability vs bcrypt/argon2; (L4) recurring-task + completion-history data modeling patterns for a SQLite-like relational store (D1)
- Admission: `gentle-ai.sdd-research-capability/v1` — grants observed and valid: `documentation` (context7: context7_query-docs, context7_resolve-library-id) and `open-web` (websearch, webfetch). No unsupported tool class used for evidence.
- Product decisions already confirmed by user (non-authoritative product choices, reflected but not re-derived): auth IN core (single password, PBKDF2 + HMAC cookie); core scope = quick tasks vertical slice with completion history + recurrence; documents deferred behind StorageAdapter; calendar/documents/study pages are follow-up changes.
- Previous evidence: exploration (openspec/changes/organizer-core/exploration.md + engram `sdd/organizer-core/explore`), verified 2026-09-21. This research supersedes the exploration's open questions about limits with fresh primary sources.

---

## 1. Lane 1 — D1 free tier limits and Pages bindings

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L1-1 | Workers Free D1 caps: **5M rows read/day, 100k rows written/day**, 5 GB total storage; limits reset daily at 00:00 UTC; no egress charges | S1, S2, S3 | **confirmed** |
| L1-2 | Caps are **enforced hard since 2026-09-01**: queries exceeding daily read/write limits fail with errors until reset; account receives email alerts; stored data unaffected | S4, S6 | **confirmed** |
| L1-3 | Free plan also caps: 10 databases, **500 MB per DB**, 7-day Time Travel (paid: 30 days), **50 queries per Worker invocation** (paid: 1000), 2 MB max row/BLOB size, 30 s max SQL duration | S3 | **confirmed** |
| L1-4 | D1 bindings work on **Cloudflare Pages** (Functions) via Wrangler file or dashboard; no plan-level restriction documented for the binding itself | S7, S8 | **confirmed** |
| L1-5 | Backup/export: Time Travel point-in-time recovery (7 days free) + `wrangler d1 export <db> --remote --output=file.sql` (schema and/or data) | S3, S9 | **confirmed** |

### Gotchas (design-relevant)

- Exceeding daily caps **bricks queries until midnight UTC reset** — a runaway query (e.g. unbounded `SELECT *`) takes the app down for the rest of the day. Mitigation: indexes, bounded/paginated reads, watch full-table scans (S1 FAQ: "add indexes to tables and review queries that perform full table scans"; S6).
- Indexes count as **extra written rows** on writes and as extra stored bytes — storage = tables + indexes (S1).
- Free storage full (5 GB account total) → must delete data before INSERT/DDL (S1).
- Large UPDATE/DELETE migrations must be batched (~1,000 rows at a time) or they exceed execution limits (S2).
- Queries per invocation: 50 on Free — recurrence/date computations must stay inside one or few invocations (S3).
- `wrangler d1 export` is the practical off-Cloudflare backup path (data never in git per confirmed decision) (S9).

### Design impact

D1-on-Free is confirmed as the persistence backbone: generous caps, hard-enforced but 1–2 orders of magnitude above single-user traffic. Mitigate the hard-cap risk with indexed, bounded queries from day one (documented in `ci-cd-hosting-setup` exploration). Bind via `wrangler.jsonc` `d1_databases` (Pages Functions bindings officially support it).

---

## 2. Lane 2 — R2 free tier: does production binding require Workers Paid?

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L2-1 | R2 free tier exists: **10 GB-month storage, 1M Class A ops, 10M Class B ops per month, free egress** (Standard storage only); paid rates $0.015/GB-month, $4.50/M Class A, $0.36/M Class B | S5, S10 | **confirmed** |
| L2-2 | Official R2 limits page lists **no plan-based restrictions** on buckets/objects (bucket count, object size 5 TiB, etc.) | S11 | **confirmed** |
| L2-3 | R2 binding to Workers and to Pages Functions is officially documented without any "paid plan required" caveat | S7, S12 | **confirmed** (absence of restriction in official docs) |
| L2-4 | Workers pricing page's "free plan includes…" sentence omits R2 (lists Workers, Pages Functions, KV, Hyperdrive) — but the same page grants R2 a Free column; treated as editorial inconsistency, **not** evidence of exclusion | S13 | **confirmed as inconsistency** |
| L2-5 | **Empirical gate**: deploying a Worker/Pages project with an R2 binding fails with `R2 binding error for bucket … Please enable R2 through the Cloudflare Dashboard. [code: 10136]` even when R2 shows active; `wrangler r2 bucket create` fails with `Please enable R2 Subscription for your account. [code: 10042]` on never-enabled accounts. An account-level R2 subscription/enablement entitlement exists and is undocumented/opaque | S14, S15, S16 | **confirmed (community/issue evidence)** |
| L2-6 | Claim from exploration ("well-sourced Sep-2026 article: R2 production binding requires Workers Paid $5/mo") | — | **unresolved article not located**; underlying restriction has partial real-world support via L2-5 (subscription gate historically tied to billing enablement, per S14/S15/community threads), but **no official source states a paid requirement** |

### Contradictions / uncertainty / freshness

- Official docs (S5, S10, S11, S13, updated Jun–Aug 2026) describe R2 as free-tier-available with no binding restriction; real-world reports (S14, S15, S16, Sep 2026) show binding failing on accounts until the R2 subscription entitlement is enabled. **The two bodies of evidence conflict**; official docs are silent on the entitlement gate.
- Historical context: 2023-era errors (S16) show R2 required explicit dashboard enablement; workers-sdk issue S15 (open, Sep 2026) confirms the enablement flow is still a known wrangler gap.
- Freshness: all pricing/limits pages updated Apr–Aug 2026; community reports Sep 2026. Verified 2026-09-21.

### Design impact

**Verdict: ambiguous — official docs say free, empirical evidence says gated.** Document binaries may *potentially* be free (10 GB free tier), but the binding entitlement can require account-level R2 subscription enablement whose cost/plan requirements are undocumented; worst case is $5/mo Workers Paid. This **confirms the exploration's mitigation**: keep the `StorageAdapter` interface, defer byte storage to the document-library change, and settle empirically in the user's own account (create bucket → bind → deploy test) before committing. Document metadata tables live in D1 either way. Do NOT block organizer-core on this.

---

## 3. Lane 3 — Workers Free CPU limit and password hashing

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L3-1 | Workers Free: **10 ms CPU time per HTTP request** (paid: 5 min, default 30 s); 100k requests/day; memory 128 MB; subrequests 50/invocation | S17, S18 | **confirmed** |
| L3-2 | Official docs: average Worker uses ~2.2 ms; "heavier workloads that handle **authentication**, server-side rendering, or parse large payloads typically use 10-20 ms" — auth is explicitly called out as a workload that can exceed the free budget | S18 | **confirmed** |
| L3-3 | PBKDF2 is available via **WebCrypto** (full API surface, no `nodejs_compat` flag needed), but **workerd caps PBKDF2 iterations at 100,000** to prevent DoS (`src/workerd/api/crypto-impl-pbkdf2.c++`) | S19, S20, S21 | **confirmed** |
| L3-4 | OWASP (current cheat sheet): PBKDF2-HMAC-SHA256 **600,000 iterations**, PBKDF2-HMAC-SHA512 **220,000** iterations recommended — the 100k workerd cap is **below** OWASP minimums | S22 | **confirmed** |
| L3-5 | Practical iteration counts on Workers free-tier CPU: community reports ~10k–20k iterations as usable ("anything above 10k-20k iterations is good"); 30k SHA-512 caused CPU exhaustion; 600k cannot fit in 10 ms | S23, S24 | **confirmed (community consensus)** |
| L3-6 | **bcrypt/argon2 are not viable**: `node:crypto` docs state `argon2`/`argon2Sync` are not supported; bcrypt has no native runtime support; pure-JS bcrypt consumes "several hundred ms" CPU → error 1102; scrypt absent from WebCrypto | S25, S26, S27 | **confirmed** |

### Design impact

- PBKDF2 via WebCrypto at **~10k–25k iterations** fits the 10 ms budget only if the hash runs **once per login** and nowhere else (session-cookie verification is HMAC, not PBKDF2). Record the iteration count as an explicit security-vs-budget tradeoff in the design (below OWASP minimums — mitigated by the single-user threat model and rate limiting).
- bcrypt/argon2 are ruled out for the Workers runtime — the confirmed PBKDF2 choice is not a preference, it is the only viable native option.
- Login is the only CPU-heavy request; keep all other handlers free of heavy crypto. Client-side hashing is NOT a valid alternative (server must verify); note `crypto.subtle` in the browser can pre-hash, but that changes the threat model — decide in design, not research.

---

## 4. Lane 4 — Recurrence + completion-history data modeling (D1/SQLite)

### Claims / patterns

| # | Pattern | Sources | Verification |
|---|---|---|---|
| L4-1 | **Template + instances**: a hidden recurring definition ("template") spawns concrete occurrence rows; users interact only with instances; the template tracks which instances exist/completed (Taskwarrior `mask`, obsidian `complete_instances[]`) | S28, S31 | **confirmed** |
| L4-2 | **Recurrence rule columns on the task row** (SQLite-friendly): `recurrence_type` (`daily|weekly|monthly|yearly|custom`), `recurrence_days` (JSON weekday array), `recurrence_on_completion` (create next on completion vs auto when date passes), `recurrence_base` (`original` vs `completion`) | S29 | **confirmed** |
| L4-3 | **Separate completion-log vs embedded**: embedded (instance rows carry status + completed_at; Taskwarrior/MyTasks) vs event-log (dedicated completions table, task_id + occurrence date + completed_at). Embedded keeps queries trivial; a log table gives an audit trail independent of task-row edits | S28, S29, S30 | **confirmed (both valid; choice is design-relevant)** |
| L4-4 | **"Due today" computation**: daily = every date; weekly = match `day_of_week`; monthly = match `day_of_month` (clamp 29–31 to last day). Occurrence math: daily +1d, weekly +7d, monthly same day-of-month (clamped) | S29, S30, S32 | **confirmed** |
| L4-5 | **Missed-occurrence semantics** (org-mode repeater cookies, adopted by Logseq): `. +` advance-from-completion (habits/cadence); `++` advance-from-schedule skipping to next future occurrence (calendar-anchored: "every Monday"); `+` stacking on fixed dates (rent on the 1st). Default `++` for calendar-anchored recurrences | S30 | **confirmed** |
| L4-6 | Auto-creation of missed occurrences on next load ("created automatically when the date passes") is a proven lightweight approach vs background cron (avoids cron triggers; fits request-driven free tier) | S29 | **confirmed** |

### Recommended synthesis for organizer-core (design input, non-authoritative)

- **Two tables**: `tasks` (one row per task template OR per occurrence) + `task_completions` (task_id, occurrence_date, completed_at) as the completion-history log for **every** task — including quick tasks. This satisfies the user's "completion history for every task" requirement and honors the project's "progress is derived, never stored" rule (streaks/history are queries over the log, never stored).
- **Recurrence fields on the task row** (L4-2 shape): `recurrence_type`, `recurrence_anchor` (start date), `recurrence_day_of_week`, `recurrence_day_of_month`, `recurrence_mode` (`on_completion` | `auto`) — sufficient for daily/weekly/monthly.
- **Default advance semantics: `++` (skip-to-future, calendar-anchored)** — "walk the dog every day" stays anchored to calendar days; missed days are skipped (optionally surfaced as missed in the UI by querying the log). `.+` (advance-from-completion) available as a per-task mode for habit-style tasks.
- **Materialize the next occurrence on completion** (or on load when `auto`): no cron triggers needed on the free tier; 5-day-missed + daily task = single UPDATE + one INSERT in one invocation (well under the 50-query cap).
- D1/SQLite specifics: store dates as ISO-8601 TEXT (`YYYY-MM-DD`), index `task_completions(occurrence_date)` and `tasks(next_due)`; single-user ⇒ no locking/conflict concerns; history grows ~365 rows/year per daily task — trivial for D1 storage and row-read caps (L1-1).

---

## Source register

| ID | Class | Title | Publisher | URL | Accessed |
|---|---|---|---|---|---|
| S1 | official docs | D1 pricing | Cloudflare | https://developers.cloudflare.com/d1/platform/pricing/ | 2026-09-21 |
| S2 | official docs | D1 FAQ | Cloudflare | https://developers.cloudflare.com/d1/reference/faq/ | 2026-09-21 |
| S3 | official docs | D1 limits | Cloudflare | https://developers.cloudflare.com/d1/platform/limits/ | 2026-09-21 |
| S4 | official changelog | D1 enforces free tier daily query limits (2026-09-01) | Cloudflare | https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement | 2026-09-21 |
| S5 | official docs | R2 pricing | Cloudflare | https://developers.cloudflare.com/r2/pricing/ | 2026-09-21 |
| S6 | tech article | Cloudflare caps D1 free tier (Sep 2026) | shattered.io | https://shattered.io/cloudflare-d1-free-tier-caps-workers-64mib-2026 | 2026-09-21 |
| S7 | official docs | Pages Functions bindings (D1, R2) | Cloudflare | https://developers.cloudflare.com/pages/functions/bindings/ | 2026-09-21 |
| S8 | official docs | Pages Functions wrangler configuration | Cloudflare | https://developers.cloudflare.com/pages/functions/wrangler-configuration/ | 2026-09-21 |
| S9 | official docs | D1 import/export data | Cloudflare | https://developers.cloudflare.com/d1/best-practices/import-export-data | 2026-09-21 |
| S10 | official docs | Workers platform pricing (R2 section) | Cloudflare | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-09-21 |
| S11 | official docs | R2 limits | Cloudflare | https://developers.cloudflare.com/r2/platform/limits/ | 2026-09-21 |
| S12 | official docs | Use R2 from Workers (bindings) | Cloudflare | https://developers.cloudflare.com/r2/api/workers/workers-api-usage/ | 2026-09-21 |
| S13 | official docs | Workers pricing — free plan inclusions sentence | Cloudflare | https://developers.cloudflare.com/workers/platform/pricing/ | 2026-09-21 |
| S14 | community | R2 binding fails with error 10136 even though R2 is active (2026-09-07) | Cloudflare Community | https://community.cloudflare.com/t/r2-binding-fails-with-error-10136-even-though-r2-is-active-and-buckets-work/956649 | 2026-09-21 |
| S15 | issue tracker | R2: first-time subscription enablement flow in Wrangler (#15468, open 2026-09-02) | cloudflare/workers-sdk | https://github.com/cloudflare/workers-sdk/issues/15468 | 2026-09-21 |
| S16 | issue tracker | Please enable R2 through the Cloudflare Dashboard [code: 10042] (#2877) | cloudflare/workers-sdk | https://github.com/cloudflare/workers-sdk/issues/2877 | 2026-09-21 |
| S17 | official docs | Workers platform limits | Cloudflare | https://developers.cloudflare.com/workers/platform/limits/ | 2026-09-21 |
| S18 | official docs | Workers limits (GitHub source: CPU section, auth 10–20 ms note) | cloudflare/cloudflare-docs | https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/limits.mdx | 2026-09-21 |
| S19 | official docs | Web Crypto runtime API | Cloudflare | https://developers.cloudflare.com/workers/runtime-apis/web-crypto | 2026-09-21 |
| S20 | official docs | node:crypto in Workers (argon2 not supported) | Cloudflare | https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/ | 2026-09-21 |
| S21 | issue tracker | crypto: 100,000 iterations of PBKDF2 is insecure (#1346, workerd cap) | cloudflare/workerd | https://github.com/cloudflare/workerd/issues/1346 | 2026-09-21 |
| S22 | security reference | Password Storage Cheat Sheet (PBKDF2 600k/220k) | OWASP | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html | 2026-09-21 |
| S23 | community | Constantly running out of CPU time (10k–20k iterations) | Cloudflare Community | https://community.cloudflare.com/t/constantly-running-out-of-cpu-time/41114 | 2026-09-21 |
| S24 | community | Long running WebCrypto API (30k PBKDF2 exhausts CPU) | Cloudflare Community | https://community.cloudflare.com/t/long-running-webcrypto-api/90953 | 2026-09-21 |
| S25 | community | Options for Password Hashing (bcrypt/argon2 not viable on Workers) | Cloudflare Community | https://community.cloudflare.com/t/options-for-password-hashing/138077 | 2026-09-21 |
| S26 | issue tracker | node:crypto.argon2 not supported (#6906) | cloudflare/workerd | https://github.com/cloudflare/workerd/issues/6906 | 2026-09-21 |
| S27 | issue tracker | support napi / argon2 WASM startup limits (#4587) | cloudflare/workerd | https://github.com/cloudflare/workerd/issues/4587 | 2026-09-21 |
| S28 | official project docs | How Recurrence Works (template + instances + mask) | Taskwarrior | https://taskwarrior.org/docs/recurrence | 2026-09-21 |
| S29 | open-source project | MyTasks — recurring tasks + SQLite schema (recurrence_type, recurrence_on_completion, recurrence_base, auto-create on date pass) | Codeberg (amelandri/MyTasks) | https://codeberg.org/amelandri/MyTasks | 2026-09-21 |
| S30 | open-source docs | Logseq recurring tasks — org-mode repeater cookies (.+ / ++ / +) | Logseq | https://github.com/HP-323/logseq/blob/master/docs/recurring-tasks.md | 2026-09-21 |
| S31 | open-source docs | obsidian-plugin-tasknotes — recurring tasks (complete_instances, scheduled advance) | GitHub (andersoal/obsidian-plugin-tasknotes) | https://github.com/andersoal/obsidian-plugin-tasknotes/blob/main/docs/features/recurring-tasks.md | 2026-09-21 |
| S32 | issue spec | Recurring tasks data model + due-date match logic (dayOfWeek/dayOfMonth) | GitHub (alexeygrigorev/datatasks #10) | https://github.com/alexeygrigorev/datatasks/issues/10 | 2026-09-21 |

## Contradictions and uncertainty summary

- **L2 (R2)**: official docs vs empirical binding failures conflict; no official source states the paid requirement; the account-level subscription gate is undocumented. Only empirical verification in the user's account settles it. (Exploration's cited article was not locatable; the claim's kernel survives via primary sources S14–S16.)
- **L3 (PBKDF2)**: workerd 100k iteration cap is below OWASP minimums (600k SHA-256 / 220k SHA-512) — a deliberate security-vs-budget tradeoff to record in the design; community-validated ~10k–25k range is the practical envelope.
- **L1/L4**: no contradictions; all primary/official or canonical project sources agree.

## Product choices (non-authoritative, orchestrator-owned)

All four confirmed product decisions are consistent with the evidence: auth-in-core with PBKDF2 (L3), quick-tasks slice with completion history + recurrence (L4), StorageAdapter-deferred documents (L2), follow-up changes for calendar/documents/study (L1/L4 fit D1-on-Free for all of them).