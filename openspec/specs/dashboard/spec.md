# dashboard Specification

## Purpose

`/` becomes the app home: an Estudia-style daily overview aggregating bounded reads of tasks and objectives into read-only cards (Tareas del día, Calendario mini grid, Próximos vencimientos, Materias entry cards). All actions live on their own pages; the dashboard mutates no data. UI copy is Spanish.

## Requirements

### Requirement: Dashboard home route

The system MUST render the dashboard at `/` and MUST NOT render the task list there; the task list lives at `/tareas` (see quick-tasks).

#### Scenario: Root is the dashboard

- GIVEN an authenticated user visits `/`
- WHEN the page renders
- THEN the dashboard renders and the task list is not shown

### Requirement: Greeting and date header

The dashboard header MUST show today's date in Spanish long format (e.g., "Martes, 22 de septiembre") and a Spanish greeting, and MAY include the user's name.

#### Scenario: Spanish date and greeting

- GIVEN the dashboard renders on a known date
- WHEN the header is inspected
- THEN the date appears in Spanish long format with a Spanish greeting

### Requirement: Tareas del día card

The card MUST list not-done tasks with an occurrence on today's date, bounded by repository read limits, showing title and done state, with a "Ver todas" link to `/tareas`. The dashboard MUST NOT expose task create, edit, or complete actions.

#### Scenario: Only today's pending tasks

- GIVEN tasks occurring today and other dates
- WHEN the dashboard renders
- THEN only today's not-done tasks appear, bounded, with a "Ver todas" link to `/tareas`

#### Scenario: Empty state

- GIVEN no tasks occur today
- WHEN the card renders
- THEN an empty-state message links to `/tareas`

### Requirement: Calendario mini month grid

The dashboard MUST render a mini month grid for the current month from one bounded, indexed `due_date` range query (limit 200, per calendar-objectives), placing objective chips on due days with derived status. The grid MUST be a semantic display grid (no ARIA `role="grid"`), day numbers MUST use `<time datetime>`, and today MUST carry `aria-current="date"`. It MUST provide a "Ver calendario completo" link to `/calendar`.

#### Scenario: Chips, today, and bounds

- GIVEN objectives due this month and a dashboard load
- WHEN the mini grid renders
- THEN one bounded query (≤ 200) runs, each due day shows its chip, and today carries `aria-current="date"`

#### Scenario: Empty month

- GIVEN a month with no objectives
- WHEN the grid renders
- THEN day cells show no chips

### Requirement: Próximos vencimientos

The dashboard MUST list not-done objectives due today or later, ordered by due date then id, bounded to 25, with derived status that MUST NOT rely on color alone; the dashboard MAY surface overdue not-done objectives at the top with an "Urgente" label.

#### Scenario: Upcoming only, bounded

- GIVEN due-today, later, and done objectives
- WHEN the list renders
- THEN only not-done objectives due today or later appear, ordered by due date, bounded to 25

#### Scenario: Non-color status cue

- GIVEN an objective shown as urgent
- WHEN it renders
- THEN it shows a text label plus any color

### Requirement: Materias entry cards

The dashboard MUST render a Materias section with entry cards linking to `/study`. Card content MUST NOT depend on a subjects data source (none exists; per-subject pages are later).

#### Scenario: Cards link to study

- GIVEN no subjects repository exists
- WHEN the user activates a Materias card
- THEN they navigate to `/study` without data-layer reads

### Requirement: Responsive layout and tokens

Dashboard sections MUST stack on narrow viewports and use a multi-column grid on wide ones. Components MUST consume global tokens via `var(--token)`; entrance animations MUST be disabled under `prefers-reduced-motion`.

#### Scenario: Layout follows the viewport

- GIVEN the dashboard renders
- WHEN the viewport is narrow
- THEN the sections stack; on wide viewports they render side by side