# quick-tasks Specification

## Purpose

Quick tasks are boolean (done / not done) items persisted in D1. Every task keeps a completion-history log, so each completion is recorded and recurrence is computed from schedule and log rather than stored. Recurring tasks (daily, weekly, monthly) default to org-mode `++` semantics: occurrences are calendar-anchored and advance to the next future occurrence, skipping missed ones. No cron triggers run; the next occurrence is materialized on completion or on load.

## Requirements

### Requirement: Task CRUD

The system MUST support creating, editing, and deleting quick tasks, and MUST persist tasks in the D1 `tasks` table.

#### Scenario: Create a task

- GIVEN the tasks page
- WHEN the user creates a task with a title
- THEN the task is persisted and appears in the task list

#### Scenario: Edit a task

- GIVEN an existing task
- WHEN the user edits its title
- THEN the stored title is updated

#### Scenario: Delete a task

- GIVEN an existing task
- WHEN the user deletes it
- THEN the task is removed from the task list

### Requirement: Completion history for every task

The system MUST record every completion of every task as a row in the D1 `task_completions` table (task, occurrence date, completed at), MUST show that history per task, and MUST derive progress views from the log rather than storing them.

#### Scenario: Completing a task logs the completion

- GIVEN an existing task
- WHEN the user marks it complete
- THEN a completion row is inserted for the current occurrence date
- AND the task is shown as done

#### Scenario: History lists every completion

- GIVEN a task completed on two different dates
- WHEN the user views the task history
- THEN both completion rows are shown in date order

#### Scenario: Uncompleting a task removes the log entry

- GIVEN a task that was marked complete
- WHEN the user unmarks it
- THEN the corresponding completion row is removed
- AND the task is shown as not done

### Requirement: Recurrence with `++` semantics

The system MUST support daily, weekly, and monthly recurrence on tasks, MUST default to org-mode `++` semantics (advance to the next future occurrence, skipping missed ones), and MUST NOT use cron or background triggers.

#### Scenario: Daily recurring task advances on completion

- GIVEN a daily task with occurrence date 2026-09-21
- WHEN the user marks it complete
- THEN a completion is logged for 2026-09-21
- AND the next occurrence is materialized as 2026-09-22

#### Scenario: Missed occurrences are skipped

- GIVEN a daily task whose last occurrence date was 2026-09-19
- WHEN the user completes it on 2026-09-22
- THEN the completion is logged for 2026-09-22
- AND the next occurrence is materialized as 2026-09-23, skipping the missed days

#### Scenario: Next occurrence materialized on load

- GIVEN a recurring task whose next occurrence date has passed without completion
- WHEN the user loads the tasks page
- THEN the occurrence advances to the next future date on that load
- AND no background job runs

### Requirement: Bounded indexed reads

The system MUST read D1 through indexed, bounded queries so each invocation stays within the 50-query cap and list views cannot exhaust the daily row-read limits.

#### Scenario: Task list is bounded

- GIVEN a user with a large task list
- WHEN the tasks page loads
- THEN only a bounded page of tasks is read