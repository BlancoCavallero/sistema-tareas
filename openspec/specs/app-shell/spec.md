# app-shell Specification

## Purpose

The app shell wraps every authenticated page in an Estudia-style frame: a sticky header with brand and primary navigation (Inicio, Tareas, Calendario, Materias, Documentos), a desktop top nav plus mobile bottom nav, and Spanish labels. It replaces the bare header in the root layout. The login page renders standalone, outside the shell.

## Requirements

### Requirement: Sticky header with brand

The system MUST render a sticky header on every non-login page, showing the brand "Estudia" and remaining visible while the page scrolls. The header MUST consume global tokens via `var(--token)` and MUST NOT redeclare the global token set.

#### Scenario: Header stays visible on scroll

- GIVEN an app page whose content is taller than the viewport
- WHEN the user scrolls down
- THEN the header remains visible at the top

#### Scenario: Brand is present

- GIVEN any authenticated app page
- WHEN the header renders
- THEN it shows the brand "Estudia" linking to `/`

### Requirement: Primary navigation

The header MUST render navigation links with Spanish labels in this order: Inicio (`/`), Tareas (`/tareas`), Calendario (`/calendar`), Materias (`/study`), Documentos (`/documents`). The nav MUST expose a descriptive `aria-label`. Materias MUST target the existing study route until per-subject pages exist.

#### Scenario: All five links render

- GIVEN an authenticated user on an app page
- WHEN the header renders
- THEN the five links appear in order with Spanish labels

#### Scenario: Materias targets the study route

- GIVEN the header renders
- WHEN the user activates the Materias link
- THEN they navigate to `/study`

### Requirement: Active navigation state

The active nav link MUST carry `aria-current="page"` and show a visible active indicator using the accent token (bottom-border style on desktop, filled style on mobile). Keyboard focus MUST use the global `:focus-visible` ring.

#### Scenario: Active link is marked

- GIVEN the user is on `/tareas`
- WHEN the header renders
- THEN the Tareas link carries `aria-current="page"` and shows a visible active indicator

#### Scenario: Keyboard focus is visible

- GIVEN a nav link reached by keyboard
- WHEN it receives focus
- THEN the global focus-visible ring renders

### Requirement: Responsive navigation

On wide viewports the shell MUST show the nav in the top header; on narrow viewports it MUST show a bottom nav bar with icon and label per nav item. Main content MUST NOT be permanently obscured by the bottom bar.

#### Scenario: Desktop top nav

- GIVEN a wide viewport
- WHEN an app page renders
- THEN the nav links appear inside the sticky header

#### Scenario: Mobile bottom nav

- GIVEN a narrow viewport
- WHEN an app page renders
- THEN a bottom nav bar with all five items (icon + label) is visible

#### Scenario: Content is not obscured

- GIVEN a narrow viewport with the bottom nav visible
- WHEN the page renders
- THEN the main content's bottom spacing keeps the last interactive element clear of the bar

### Requirement: Logout remains reachable

The shell MUST keep the logout control reachable on desktop and mobile without changing its behavior.

#### Scenario: Logout on desktop and mobile

- GIVEN an app page on desktop or mobile
- WHEN the user looks for the logout control
- THEN it is reachable from the header or the bottom nav

### Requirement: Login renders standalone

The shell MUST NOT render the header or bottom nav on `/login`.

#### Scenario: Login has no shell

- GIVEN the user visits `/login`
- WHEN the page renders
- THEN no app header or bottom nav is shown

### Requirement: Page titles

Every page inside the shell MUST set a Spanish document title via `svelte:head`.

#### Scenario: Title is set

- GIVEN an app page such as `/tareas`
- WHEN the page renders
- THEN the document title is a Spanish string describing the page