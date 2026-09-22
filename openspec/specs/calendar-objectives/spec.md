# calendar-objectives Specification

## Purpose

Objectives are one-off dated events (exams, deadlines, other) stored in D1 and shown on `/calendar`. Status (`upcoming`, `overdue`, `done`) is derived at read time with the Buenos Aires `today()` helper, never stored. Lists and a month grid use bounded, indexed queries. Recurrence, reminders, and subject linkage are out of scope.

## Requirements

### Requirement: Objective CRUD

The system MUST support creating, editing, and deleting objectives in D1. Each objective has a required title, a `YYYY-MM-DD` due date, a kind of `exam`, `deadline`, or `other`, and optional notes. Invalid input MUST return `fail(400)` with a Spanish message.

#### Scenario: Create an objective

- GIVEN the calendar page
- WHEN the user creates an objective with a title, kind, and due date
- THEN it is persisted

#### Scenario: Edit and delete an objective

- GIVEN an existing objective
- WHEN the user edits its fields and later deletes it
- THEN the values are updated, then it is removed from every view

### Requirement: Manual completion toggle

The system MUST support toggling done state. Marking done MUST persist `done = 1` and `completed_at`; unmarking MUST persist `done = 0` and clear `completed_at`. Done state MUST NOT be derived from the due date.

#### Scenario: Mark done

- GIVEN an objective that is not done
- WHEN the user marks it done
- THEN `done` is 1, `completed_at` is set, and it is shown as done

#### Scenario: Unmark done

- GIVEN a done objective
- WHEN the user unmarks it
- THEN `done` is 0, `completed_at` is cleared, and it returns to its derived status

### Requirement: Derived status

The system MUST derive status (`upcoming`, `overdue`, `done`) in a pure domain module using the Buenos Aires `today()` helper. An objective is `overdue` only when not done and due before today; one due today is `upcoming`. Status MUST NOT use SQL date functions or the local clock.

#### Scenario: Overdue boundary

- GIVEN a not-done objective due before today and another due today
- WHEN the page loads
- THEN the first is overdue and the second is upcoming

#### Scenario: Done is never overdue

- GIVEN a done objective with a past due date
- WHEN the page loads
- THEN it is shown as done, not overdue

### Requirement: List views

`/calendar` MUST present upcoming (not done, due today or later), overdue (not done, due before today), and all views, each ordered by due date then id and bounded to 25 objectives.

#### Scenario: List filters and bounds

- GIVEN objectives due before and after today, done and not done
- WHEN the user opens each view
- THEN only matching not-done objectives are listed, bounded to 25

### Requirement: Month grid

The system MUST render a month grid for a selected month from one bounded, indexed `due_date` range query limited to 200, with bounds computed from the ART date. The grid MUST be a semantic display grid and MUST NOT use ARIA `role="grid"`/`gridcell` or roving-tabindex navigation. Day numbers MUST use `<time datetime>` and today MUST carry `aria-current="date"`.

#### Scenario: Month range query

- GIVEN a selected month
- WHEN the grid loads
- THEN one range query bounded by the month's start and end dates runs

#### Scenario: Today is marked

- GIVEN the current month
- WHEN the grid renders
- THEN today's cell carries `aria-current="date"`

#### Scenario: Empty month

- GIVEN a month with no objectives
- WHEN the grid renders
- THEN every day cell shows with no objective chips

### Requirement: One-off objectives

Objectives MUST be one-off: the system MUST NOT store recurrence rules, advance due dates, or run scheduled jobs.

#### Scenario: Never auto-advances

- GIVEN an objective whose due date has passed
- WHEN the page loads
- THEN its due date is unchanged
