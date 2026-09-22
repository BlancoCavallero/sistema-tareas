# Research: calendar-objectives

- Phase: `sdd-research`
- Date: 2026-09-22
- Change name: `calendar-objectives`
- Artifact store: openspec (repo-local) + engram topic `sdd/calendar-objectives/research`
- Artifact type: `gentle-ai.sdd-research/v1`
- Revision: 1
- Outcome: `done` (3 selected lanes source-backed; no lane left unsupported)
- Questions:
  - **L1** — What are the best-practice patterns for a simple, accessible month-grid calendar in Svelte 5 runes + vanilla CSS, without a heavy dependency?
  - **L2** — What CSS/design foundation (tokens, type scale, color incl. dark mode, focus, contrast, responsive) fits this SvelteKit app's existing plain-scoped-styles pattern, and what concrete token recommendations should a single-dev app adopt?
  - **L3** — What is the correct bounded, indexed query shape for a month range in D1/SQLite, and does a month grid + lists fit the reused Free-tier caps?
- Admission: `gentle-ai.sdd-research-capability/v1` — exact grants observed and valid: `documentation` (context7: `context7_query-docs`, `context7_resolve-library-id`) and `open-web` (`websearch`, `webfetch`). No unsupported tool class was used for evidence. Persistence tools are not evidence grants and produced no claims.
- Scope note (non-re-derivation): D1 Free-tier caps (5M rows read/day, 100k rows written/day, 50 queries/invocation, 10 ms CPU/request, no auto-migrations, no cron in Pages) are **reused from `organizer-core/research.md` (2026-09-21)** and are not re-researched here. This research only extends them where the month grid creates a genuinely new evidence need.
- Previous evidence: `openspec/changes/calendar-objectives/exploration.md` (175 lines, 2026-09-22) + engram `sdd/calendar-objectives/explore`.

---

## Lane 1 — Month-grid UI patterns (Svelte 5 + vanilla CSS)

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L1-1 | A month calendar is a 7-column grid: `grid-template-columns: repeat(7, 1fr)`. The first day of the month is offset into the correct weekday column with `grid-column-start` (e.g. Wednesday → `grid-column-start: 4`); auto-placement then lays out the remaining days row by row. | S15, S17 | **confirmed** (two independent implementations) |
| L1-2 | An alternative grid approach is one grid **per week** (`grid-template-columns: repeat(7, 1fr); grid-auto-flow: dense`) so events flow within a week; a single month-wide grid makes intra-week event flow harder. | S16 | **confirmed** |
| L1-3 | A calendar is arguably tabular data, and accessibility practitioners have argued a `<table>` is the more appropriate structure than divs; a plain CSS-grid list is also defensible when the content is ordered days. | S15 | **confirmed** (opinion, explicitly framed as such by the source) |
| L1-4 | The W3C APG models a calendar as the **grid pattern inside a date-picker dialog**: `role="grid"` container labelled by `aria-labelledby`, weekday headers as `columnheader` (non-focusable), day cells as `gridcell`, `aria-selected` on the selected day, the month/year heading as a live region, and full day names exposed via `abbr` on abbreviated column headers. | S5 | **confirmed** |
| L1-5 | The APG grid pattern is a **composite widget**: it always contains multiple focusable elements, **only one is in the page tab sequence**, and the author must implement arrow-key focus movement (roving tabindex or `aria-activedescendant`). Arrow keys move by cell; Home/End move to row ends; PageUp/PageDown move by rows. | S6, S5 | **confirmed** |
| L1-6 | Explicit APG warning: "Do not implement keyboard navigation schemes that would place more than one calendar day in the tab order at any time." | S5 (APG 1.1 date picker text) | **confirmed** |
| L1-7 | `aria-current="date"` is the correct ARIA value for **today** within a calendar ("Represents the current date within a collection of dates such as the current date within a calendar"). Only one element in a set should carry `aria-current`. | S32 | **confirmed** |
| L1-8 | Svelte component `<style>` blocks are scoped to the component; scoped selectors gain specificity `0-1-0`, so a component rule beats an equally specific global stylesheet rule. | S1 | **confirmed** |
| L1-9 | Svelte supports a `:global {...}` block and a `:global(selector)` modifier for the small amount of styling that must escape scoping (e.g. `:global(body)`). | S2 | **confirmed** |
| L1-10 | CSS custom properties can be passed directly to a component instance (`<Slider --track-color="black" />`) and consumed inside that component's scoped styles — a clean way to theme a child without global CSS. | S3 | **confirmed** |
| L1-11 | Keyed `{#each ... (key)}` blocks let Svelte track list items by identity — the right tool for event chips per day so reordering/rerender does not thrash DOM. | S4 | **confirmed** |
| L1-12 | Library evaluation: no small Svelte 5 calendar library is clearly worth the dependency for this use case. `@event-calendar/core` is 35 kB br-compressed and zero-dependency but is a full drag-and-drop event calendar (resources, timelines, interaction plugins) — far beyond a read-only month view. `svelte-calendar` is a Svelte 3 date **picker**, last published ~5 years ago. `shadcn-svelte`'s Calendar is a date picker built on Bits + `@internationalized/date` (not a month view of events). SVAR Svelte Calendar is feature-rich but gates the useful views behind a PRO edition. | S24, S25, S26, S27 | **confirmed** (package metadata) |

### Gotchas (design-relevant)

- The expensive part of a calendar is **not** the CSS grid — it is the APG `role="grid"` keyboard/focus machinery (roving tabindex, arrow-key handlers, one-tab-stop invariant) (L1-5, L1-6). A read-only month **visualization** whose dates are chosen via the form (`<input type="date">`) does not need that machinery, and faking `role="grid"` without implementing it is worse than not using it (L1-4, L1-5).
- Grid auto-placement handles month offset only if the first day is explicitly placed; without `grid-column-start` the 1st lands in the Monday cell (L1-1).
- A single month-wide grid makes multi-day/intra-week event flow awkward; week-per-grid with `grid-auto-flow: dense` is the documented fix if chips ever need to span (L1-2).
- Scoped-style specificity (L1-8) means component styles can silently override a global token consumer; keep the global layer to `:root` token declarations and a minimal reset.

### Design implication (non-authoritative)

Render the month as a **plain semantic display grid** (weekday header row + day cells), not as an ARIA `role="grid"` widget. Use `<time datetime="YYYY-MM-DD">` for day numbers, `aria-current="date"` on today (L1-7), a labelled month heading (`<h2>` / `aria-label`), and a `<ul>` of event chips per day. Reserve the full APG grid pattern for a future interactive date picker if one is ever needed. This satisfies L1-7 and avoids the L1-5/L1-6 cost entirely.

---

## Lane 2 — CSS / design foundation for the page

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L2-1 | Custom properties declared on `:root` provide one canonical, inherited declaration point for a document-wide token set, which is the documented pattern for theming (`--main-bg-color` on `:root`, referenced via `var()`). | S7 | **confirmed** |
| L2-2 | Custom properties can declare typed fallbacks via the `@property` at-rule (`syntax`, `inherits`, `initial-value`), which makes invalid substitutions fall back predictably instead of to the property's initial value. | S7 | **confirmed** |
| L2-3 | **Gotcha**: `var()` cannot be used for property names, selectors, or inside media/container query conditions. Responsive tokens must therefore use `clamp()` or media queries that *override the token value*, not `@media (min-width: var(--bp))`. | S7 | **confirmed** |
| L2-4 | Dark mode: `@media (prefers-color-scheme: dark)` detects the OS/user preference and is the baseline mechanism; the `color-scheme` property should be set on the root element so the browser themes native UI (scrollbars, form controls, canvas) and avoids white flashes. | S10, S11 | **confirmed** |
| L2-5 | Semantic tokens (role-named, e.g. `--color-surface`, `--state-focus`) with identical names across light/dark and only different values are the recommended structure; components should never reference raw color names. State tokens (`hover`, `pressed`, `focus`, `disabled`) belong in the token set too. | S29, S30 | **confirmed** |
| L2-6 | `:focus-visible` is Baseline widely available (since March 2022) and is the correct selector for focus styling: it matches only when the UA judges the user needs to see focus, so pointer clicks do not draw the ring while keyboard navigation does. `outline` + `outline-offset` is the canonical mechanism, with `@supports not selector(:focus-visible)` as the legacy fallback. | S8 | **confirmed** |
| L2-7 | WCAG contrast minimums: body text **4.5:1**, large text (≥18pt, or 14pt bold) **3:1**, and active UI components/graphical objects **3:1** (SC 1.4.3 / 1.4.6 / 1.4.11). MDN recommends verifying with a contrast checker rather than eyeballing. | S9, S8 | **confirmed** |
| L2-8 | The focus indicator itself must meet **3:1** (WCAG 2.1 SC 1.4.11 Non-Text Contrast). | S8 | **confirmed** |
| L2-9 | Dark-mode practice: use deep grays rather than pure black for surfaces, tone down saturated accents, keep button text ≥4.5:1, layer elevation with lighter surfaces, and never rely on color alone — pair color with text, icons, or shapes for states/alerts. | S31, S29 | **confirmed** |
| L2-10 | Fluid type/space scales can be expressed as precalculated `clamp(min, preferred, max)` custom properties (e.g. `--step-0: clamp(1rem, 0.7143rem + 1.4286vw, 2rem)`), interpolating between a min and max viewport with no media queries. Utopia provides a calculator that emits the precalculated CSS. | S12, S13, S14 | **confirmed** |
| L2-11 | `@media (prefers-reduced-motion: reduce)` should disable non-essential transitions; UI interaction durations should stay ≤300 ms. | S29 | **confirmed** |

### Concrete token recommendation (design input, non-authoritative)

The app today uses plain scoped styles with hardcoded GitHub-Primer-like hex values scattered across `+layout.svelte`, `TaskItem.svelte`, `TaskForm.svelte` (`#d0d7de`, `#57606a`, `#0969da`, `#b00020`, `#1a7f37`, `#ddf4ff`). The lowest-friction foundation is therefore a **single global token file** (`src/lib/styles/tokens.css`, imported once from `+layout.svelte`), containing only `:root` custom properties + `color-scheme` + a minimal reset, while components keep their scoped `<style>` blocks and reference `var(--...)`.

Suggested palette (light / dark), chosen to preserve the app's existing visual language and Primer's documented background↔foreground pairing rule (S29):

| Token | Light | Dark | Role |
|---|---|---|---|
| `--color-bg` | `#ffffff` | `#0d1117` | page background |
| `--color-surface` | `#f6f8fa` | `#161b22` | panels / calendar cells |
| `--color-border` | `#d0d7de` | `#30363d` | borders (existing light value) |
| `--color-text` | `#1f2328` | `#e6edf3` | body text |
| `--color-text-muted` | `#57606a` | `#8b949e` | meta text (existing light value) |
| `--color-accent` | `#0969da` | `#58a6ff` | links / primary (existing light value) |
| `--color-accent-soft` | `#ddf4ff` | `#12324a` | badge/chip background (existing light value) |
| `--color-success` | `#1a7f37` | `#3fb950` | done (existing light value) |
| `--color-danger` | `#b00020` | `#ff7b72` | errors (existing light value) |
| `--color-overdue-bg` | `#ffebe9` | `#3d1418` | overdue chip background |
| `--color-overdue-text` | `#b00020` | `#ff7b72` | overdue chip text |

**Overdue highlight rule**: dark text on a soft tinted background (high contrast), **plus** a non-color cue — a visible "Vencida" label and/or icon — to satisfy the no-color-only-cue rule (L2-9). Verify the final ratios with a checker (L2-7) rather than assuming.

Type scale (static fallback; a fluid `clamp()` scale is optional per L2-10):
`--text-sm: 0.875rem`, `--text-base: 1rem`, `--text-lg: 1.25rem`, `--text-xl: 1.5rem`, `--text-2xl: 1.875rem`.

Spacing (4 px base): `--space-1: 0.25rem` … `--space-8: 2rem`, `--space-12: 3rem`.
Radius: `--radius-sm: 0.25rem`, `--radius-md: 0.5rem` (existing), `--radius-full: 999px` (existing pill).
Focus: `--focus-ring: 2px solid var(--color-accent)`, `--focus-offset: 2px`, applied via `:focus-visible` (L2-6, L2-8).
Motion: `--duration-fast: 100ms`, `--duration-base: 200ms`, `--ease-out`, gated behind `prefers-reduced-motion` (L2-11).

### Styling-strategy tradeoff (design input, non-authoritative)

| Strategy | Fit with existing code | Cost | Evidence |
|---|---|---|---|
| **Plain scoped CSS + a `:root` token file** (recommended) | Matches the current convention exactly; zero new dependencies; Svelte scoping already works | Requires a one-time refactor of hardcoded hexes | S1, S2, S7 |
| Utility framework (e.g. Tailwind) | Conflicts with the established scoped-`<style>` pattern; adds a build dependency and config | New toolchain + rewrite of existing components | S2 (global styles needed for utilities), S29 (token discipline still required) |
| Per-component tokens only (no global file) | Fragments the palette; dark mode needs a duplicate declaration in every component | Token drift | S7 (`:root` is the canonical declaration point), S30 |

**Verdict: plain scoped CSS + one global `:root` token file.** It is the only option with zero new dependencies that preserves the existing component pattern, and it is the documented approach for `:root`-scoped custom properties (L2-1).

### Responsive behavior for the month grid (design input, non-authoritative)

- Keep the 7-column `repeat(7, 1fr)` grid at all widths; let cells shrink. Below ~480 px, reduce cell padding and show event chips as a compact count/dot + accessible label rather than full titles.
- Do not rely on `var()` inside a media query condition (L2-3); if a breakpoint-specific token value is needed, override the token *inside* the media query, or use a `clamp()`-based fluid token (L2-10).
- The `.shell-main` container is already `max-width: 56rem` with `1.5rem` padding; the grid should sit inside it without a new layout shell.

---

## Lane 3 — D1 month-grid query evidence

### Claims

| # | Claim | Sources | Verification |
|---|---|---|---|
| L3-1 | D1's own index guidance names **dates** as good columns to index for typical web apps, and documents `CREATE INDEX idx_TABLE_COLUMN ON table(column)`. | S18 | **confirmed** |
| L3-2 | `BETWEEN` is logically equivalent to `x >= y AND x <= z` (the left expression is evaluated once), and a range predicate on an indexed column can be satisfied by the index. | S20, S18 | **confirmed** |
| L3-3 | SQLite stores dates as TEXT/INTEGER/REAL; with ISO-8601 text (`YYYY-MM-DD HH:MM:SS`) **lexicographical order equals chronological order**, so string comparison is valid for date ranges. SQLite's built-in `date()` returns `YYYY-MM-DD`. | S21, S19 | **confirmed** (statement by SQLite's lead author on the project forum) |
| L3-4 | Default text comparison uses the **BINARY** collating function (`memcmp`) unless a column or expression specifies otherwise — so ISO-8601 TEXT comparisons are byte-wise and time-correct. | S28 | **confirmed** |
| L3-5 | `EXPLAIN QUERY PLAN` is the documented way to prove an index is used: `SEARCH ... USING INDEX` means indexed; `SCAN` means full table scan. D1 recommends running `PRAGMA optimize` after creating an index so the query planner has statistics. | S18 | **confirmed** |
| L3-6 | D1 bills by **rows read/written**, not rows returned; an unindexed `WHERE column = ?` scans the whole table. An index reduced a demo query to 417 rows read. | S18, S23 | **confirmed** |
| L3-7 | Multi-column indexes are only used when the query supplies all columns or a leftmost prefix; a partial index (`WHERE ...`) keeps the index smaller for hot subsets. Indexes themselves add storage and write cost. | S18 | **confirmed** |
| L3-8 | D1 prepared statements support parameter binding (`.prepare(sql).bind(...)`), which is the correct way to pass month bounds. | S22 | **confirmed** |
| L3-9 | SQLite's own date functions operate in **UTC**; `date('now')` is the UTC date, not a local-timezone date. | S19 | **confirmed** |

### Gotchas (design-relevant)

- **`date('now')` is UTC, not ART** (L3-9). "Today" and therefore "overdue" must come from the app's `today()` helper (`America/Argentina/Buenos_Aires`), not from SQL. This is a real off-by-one risk near midnight ART.
- ISO-8601 TEXT range queries only behave correctly if **every** stored value is the same canonical format. The exploration's `YYYY-MM-DD` convention satisfies this; mixing `YYYY-MM-DD HH:MM:SS` into the same column would still sort correctly but would break exact-day equality checks (L3-3).
- An index is not free: it adds rows written on INSERT/UPDATE and storage bytes (L3-7), which matters under the reused 100k writes/day cap.
- `LIMIT` is still required even with an index: an index bounds the *scan*, not the *result set*.

### Recommended query shape (design input, non-authoritative)

```sql
-- Month grid: one bounded, indexed range query per month view.
SELECT id, title, kind, due_date, notes, done, completed_at
FROM objectives
WHERE due_date BETWEEN ?1 AND ?2          -- month_start, month_end (YYYY-MM-DD, computed in ART)
ORDER BY due_date, id
LIMIT 200;

-- List views: one bounded, indexed query each (or one query + in-memory split).
SELECT id, title, kind, due_date, notes, done, completed_at
FROM objectives
WHERE due_date >= ?1 AND done = 0         -- "upcoming" from today
ORDER BY due_date, id
LIMIT 25;

SELECT id, title, kind, due_date, notes, done, completed_at
FROM objectives
WHERE due_date < ?1 AND done = 0          -- "overdue" vs today (ART)
ORDER BY due_date, id
LIMIT 25;
```

- `LIMIT 200` for the month grid: a month has ≤31 days; 200 is a safety bound that cannot truncate a realistic single-user month while still guaranteeing a hard cap.
- `LIMIT 25` for lists mirrors the existing `LIST_LIMIT = 25` convention in `src/lib/server/tasks/repository.ts`.
- Index: `CREATE INDEX idx_objectives_due_date ON objectives(due_date);` (already the exploration's plan) — the range predicate is a leftmost-prefix use of a single-column index (L3-1, L3-2, L3-7).
- Run `PRAGMA optimize` once after the migration (L3-5).
- Optional: a partial index `... ON objectives(due_date) WHERE done = 0` would shrink the list-view index, at the cost of an extra index to maintain (L3-7). Not needed at this scale.

### Budget check (design inference, not an external claim)

Month grid = **1** range query; lists = **1–2** queries (or 1 query split in memory). That is ≤3 of the reused **50 queries/invocation** cap. The CPU work is string comparison plus a loop over ≤31 cells — trivial against the reused **10 ms CPU/request** cap; no crypto or heavy parsing is added. Single-table, no JOIN, no N+1. **Verdict: trivially within budget.** The dominant risk remains rows-read discipline (index + `LIMIT`), not query count (L3-6, and reused organizer-core L1-1/L1-3).

---

## Source register

| ID | Class | Title | Publisher | URL | Accessed | Excerpt (key) |
|---|---|---|---|---|---|---|
| S1 | official docs | Scoped styles (`<style>`) | Svelte | https://github.com/sveltejs/svelte/blob/main/documentation/docs/04-styling/01-scoped-styles.md | 2026-09-22 | "Each scoped selector receives a specificity increase of 0-1-0" |
| S2 | official docs | Global styles (`:global`) | Svelte | https://github.com/sveltejs/svelte/blob/main/documentation/docs/04-styling/02-global-styles.md | 2026-09-22 | "To apply styles to a group of selectors globally, create a `:global {...}` block" |
| S3 | official docs | Custom properties passed to components | Svelte | https://github.com/sveltejs/svelte/blob/main/documentation/docs/04-styling/03-custom-properties.md | 2026-09-22 | `<Slider --track-color="black" />` consumed inside the child |
| S4 | official docs | Keyed each blocks | Svelte | https://github.com/sveltejs/svelte/blob/main/documentation/docs/03-template-syntax/03-each.md | 2026-09-22 | `{#each expression as name (key)}` |
| S5 | standards | Date Picker Dialog Example (APG 1.2) | W3C WAI | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog | 2026-09-22 | "only one button in the calendar grid is in the Tab sequence"; grid has `aria-labelledby`; day cells `gridcell`; weekday headers `columnheader`; month heading is a live region |
| S6 | standards | Grid Pattern (APG) | W3C WAI | https://www.w3.org/WAI/ARIA/apg/patterns/grid/ | 2026-09-22 | "Only one of the focusable elements contained by the grid is included in the page tab sequence"; arrow/Home/End/PageUp-Down keyboard model; `role=grid`/`row`/`gridcell` |
| S7 | official docs | Using CSS custom properties (variables) | MDN | https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties | 2026-09-22 | `:root` canonical declaration; `@property` typed fallbacks; "Variables do not work inside media queries and container queries" |
| S8 | official docs | `:focus-visible` pseudo-class | MDN | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible | 2026-09-22 | Baseline widely available since March 2022; "WCAG 2.1 SC 1.4.11 Non-Text Contrast requires that the visual focus indicator be at least 3 to 1"; `@supports not selector(:focus-visible)` fallback |
| S9 | official docs | Color contrast (Understanding WCAG) | MDN | https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast | 2026-09-22 | Body text 4.5:1 AA / 7:1 AAA; large text 3:1; UI components and graphical objects 3:1 |
| S10 | official docs | `prefers-color-scheme` media feature | MDN | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme | 2026-09-22 | Light by default, override with `prefers-color-scheme: dark`; `color-scheme` on a parent affects embedded content |
| S11 | official guidance | Dark mode (modern web guidance) | Google Chrome | https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/user-experience/dark-mode.md | 2026-09-22 | "MANDATORY: Apply the `color-scheme` property to the `html` element or the `:root` pseudo-class" |
| S12 | reference article | Clamp | Utopia | https://utopia.fyi/blog/clamp | 2026-09-22 | Precalculated `--step-0: clamp(1rem, 0.7143rem + 1.4286vw, 2rem)` |
| S13 | tech article | Meet Utopia: Designing And Building With Fluid Type And Space Scales | Smashing Magazine | https://www.smashingmagazine.com/2021/04/designing-developing-fluid-type-space-scales | 2026-09-22 | `font-size: var(--step-2)` from a fluid type scale; fluid space units as T-shirt sizes |
| S14 | reference article | Fluid custom properties | Utopia | https://utopia.fyi/blog/fluid-custom-properties | 2026-09-22 | Fluid custom properties replace a media query per CSS lock |
| S15 | tech article | A Calendar in Three Lines of CSS | CSS-Tricks | https://css-tricks.com/a-calendar-in-three-lines-of-css | 2026-09-22 | "A seven-column grid makes for a calendar layout pretty quick"; offset first day with `grid-column-start`; a11y argument for tables |
| S16 | tech article | Calendar with CSS Grid | Snook.ca | https://snook.ca/archives/html_and_css/calendar-css-grid | 2026-09-22 | `.week { grid-template-columns: repeat(7, 1fr); grid-auto-flow: dense; }` |
| S17 | tech article | How to Build a Fully-Featured Calendar with CSS Grid | Bomberbot | https://www.bomberbot.com/css-grid/how-to-build-a-fully-featured-calendar-with-css-grid | 2026-09-22 | `.weekdays, .dates { display: grid; grid-template-columns: repeat(7, 1fr); }`; `.dates button:first-child { grid-column-start: 4; }` |
| S18 | official docs | Use indexes | Cloudflare D1 | https://developers.cloudflare.com/d1/best-practices/use-indexes/ | 2026-09-22 | "dates are good choices for columns to index"; `EXPLAIN QUERY PLAN` → `USING INDEX` vs `SCAN`; leftmost-prefix rule; partial indexes; "Run `PRAGMA optimize`"; billing by rows read |
| S19 | official docs | Date And Time Functions | SQLite | https://www.sqlite.org/lang_datefunc.html | 2026-09-22 | `date()` returns `YYYY-MM-DD`; ISO-8601 text is a supported storage format; "Universal Coordinated Time (UTC) is used"; valid range 0000-01-01 … 9999-12-31 |
| S20 | official docs | SQL Language Expressions (BETWEEN) | SQLite | https://www.sqlite.org/lang_expr.html | 2026-09-22 | "`x BETWEEN y AND z` is equivalent to `x >= y AND x <= z` except that with BETWEEN, the x expression is only evaluated once" |
| S21 | official forum | datetime problem (drh reply) | SQLite (SQLite User Forum) | https://sqlite.org/forum/info/7c79d9057f35851c | 2026-09-22 | "Store the dates as strings in the ISO-8601 date/time format (YYYY-MM-DD HH:MM:SS) which has the useful property that lexicographical order and chronological order are the same" |
| S22 | official docs | `prepare()` / prepared statements | Cloudflare D1 | https://developers.cloudflare.com/d1/worker-api/d1-database/ | 2026-09-22 | `.prepare("SELECT * FROM Customers WHERE CompanyName = ?").bind(someVariable)` |
| S23 | official blog | D1 open beta is here | Cloudflare | https://blog.cloudflare.com/d1-open-beta-is-here | 2026-09-22 | Indexed date query: `"rows_read": 417` with the index present |
| S24 | package metadata | `@event-calendar/core` | npm | https://www.npmjs.com/package/@event-calendar/core | 2026-09-22 | "Lightweight (35kb br compressed)"; "Svelte 5 component"; drag & drop, resource/timeline views |
| S25 | package metadata | `svelte-calendar` | npm | https://www.npmjs.com/package/svelte-calendar | 2026-09-22 | "A small date picker built with Svelte 3"; last publish 5 years ago |
| S26 | official docs | Calendar (shadcn-svelte) | shadcn-svelte | https://svelte-4.shadcn-svelte.com/docs/components/calendar | 2026-09-22 | "built on top of the Bits Calendar component, which uses the `@internationalized/date` package"; a date picker, not a month event view |
| S27 | open-source project | SVAR Svelte Calendar | GitHub | https://github.com/svar-widgets/calendar | 2026-09-22 | Day/Week/Month views; PRO Edition gates Year/Agenda/Timeline/Resources and recurring events |
| S28 | reference article | SQLite Collating Sequences | w3resource | https://www.w3resource.com/sqlite/sqlite-collating-function-or-sequence.php | 2026-09-22 | "BINARY - Compares string data using `memcmp()`"; BINARY is the default for comparison operators |
| S29 | design-system docs | Design tokens guide | GitHub Primer | https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md | 2026-09-22 | "Never use raw values"; MUST pair background↔foreground tokens; `:focus-visible` not `:focus`; respect `prefers-reduced-motion`; keep UI motion ≤300 ms |
| S30 | tech article | How to Structure Design Tokens for Light and Dark Mode | DEV Community | https://dev.to/hasansarwer/how-to-structure-design-tokens-for-light-and-dark-mode-11b2 | 2026-09-22 | "Light and dark mode should use the same token names. Only the values should change."; state tokens (`hover`, `focus`, `disabled`) |
| S31 | tech article | Dark Mode Done Right: Best Practices for 2026 | Medium | https://medium.com/@social_7132/dark-mode-done-right-best-practices-for-2026-c223a4b92417 | 2026-09-22 | Honor `prefers-color-scheme` + `color-scheme`; "No color-only cues: Pair color with text, icons, or shapes"; deep grays not pure black |
| S32 | official docs | `aria-current` attribute | MDN | https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current | 2026-09-22 | "`date`: Represents the current date within a collection of dates such as the current date within a calendar"; "Only mark one element in a set of elements as current" |

---

## Contradictions and uncertainty

- **No cross-source contradictions** were found within any lane. L1's table-vs-div question is a genuine, source-acknowledged opinion split (S15 frames it as an opinion, not a rule); the artifact resolves it by choosing a semantic display grid and explicitly *not* claiming `role="grid"` (L1-4/L1-5).
- **Uncertainty — exact contrast ratios of the proposed palette**: the recommended hex values are chosen to extend the app's existing Primer-like palette and Primer's pairing rule (S29), but this research did not compute exact contrast ratios. The values must be verified with a contrast checker (S9) during design/implementation. The overdue treatment is deliberately specified as dark-text-on-soft-tint **plus a text label** so correctness does not depend on a single unverified ratio (L2-9).
- **Uncertainty — library bundle size**: the 35 kB figure for `@event-calendar/core` is the package's own README claim (S24), not an independently measured bundle. It is used only to support the "no library needed" conclusion, which would hold even at a smaller size given the feature mismatch.
- **Freshness**: Svelte docs (5.x), D1 docs (use-indexes updated 2026-08-10; prepare() current), SQLite docs (date functions updated 2026-07-11), MDN pages (2025-06 … 2026-09), Utopia/Chrome guidance (2026). All accessed 2026-09-22. No source older than ~2021 is load-bearing except the CSS-Tricks/calendar technique articles, whose CSS Grid mechanics are stable.
- **Deliberately not researched** (out of scope per confirmed decisions): recurrence engines (no recurrence), reminder/notification delivery (out of scope), subject linkage (deferred to the study-pages change).

---

## Product choices (non-authoritative, orchestrator-owned — confirmed by user)

1. Research phase requested, including the CSS/design lane. ✅ reflected in L2.
2. Recurrence: **none** — one-off dated events. ✅ no recurrence research performed.
3. View: **both** a list view (upcoming / overdue / all) **and** a month grid; events added via list/form. ✅ addressed in L1 + L3 query shapes.
4. Completion: manual done toggle with `completed_at`; overdue is derived (`due_date < today AND done = 0`). ✅ supported by the L3 query shapes and the UTC-vs-ART gotcha (L3-9).
5. Subject linkage: **deferred** to the study-pages change. ✅ not researched.
6. Kind taxonomy: `exam | deadline | other`. ✅ orthogonal to this research.
7. Reminders/notifications: **out of scope**; in-app overdue/upcoming highlighting is the substitute. ✅ the L2 overdue-token recommendation serves exactly this.

These are product choices, not evidence claims; the evidence above is consistent with all of them.

---

## Ready for proposal

**Yes.** All three selected lanes are source-backed and `done`. The evidence supports the confirmed product decisions without contradiction, and the two open technical details (exact contrast ratios; final `LIMIT` value) are implementation-time verifications, not blockers. No lane is `partial` and no admission or persistence step failed.
