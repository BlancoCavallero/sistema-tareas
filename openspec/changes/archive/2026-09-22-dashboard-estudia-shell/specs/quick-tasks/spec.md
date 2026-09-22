# Delta for quick-tasks

## ADDED Requirements

### Requirement: Task page route

The task list MUST be served at `/tareas`: the full task list with create, edit, delete, and completion actions MUST render there. `/` MUST NOT render the task list; it renders the dashboard (see dashboard spec). Task data behavior (CRUD, completion history, recurrence, bounded reads) MUST remain unchanged.

#### Scenario: Task list at /tareas

- GIVEN an authenticated user
- WHEN they visit `/tareas`
- THEN the task list with create, edit, delete, and complete actions renders

#### Scenario: Root no longer hosts tasks

- GIVEN an authenticated user visits `/`
- WHEN the page renders
- THEN the dashboard renders and the task list is not shown

#### Scenario: Existing actions still work

- GIVEN the user is on `/tareas`
- WHEN they create or complete a task
- THEN the existing form action succeeds with `use:enhance`

#### Scenario: Main-spec preconditions still hold

- GIVEN the tasks page at `/tareas`
- WHEN any existing quick-tasks scenario runs
- THEN its preconditions and outcomes are unchanged at the new route