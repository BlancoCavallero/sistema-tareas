# Project Workflow

> A general-purpose development workflow for software projects using Git and GitHub.

**Version:** 1.3  
**Status:** Draft  
**Scope:** General-purpose  
**Last Updated:** 2026-09-06

---

# 1. Purpose

This document defines a standardized workflow for developing, reviewing, validating, integrating, and releasing changes in a software project.

The workflow is designed to:

- Keep development organized and traceable.
- Establish consistent Git and GitHub practices.
- Separate development, integration, and production code.
- Reduce integration problems.
- Automate repetitive validation tasks.
- Make code review more effective.
- Provide a controlled role for AI-assisted development.
- Preserve important project knowledge and decisions.
- Remain independent of programming language, framework, architecture, or technology stack.

Projects may extend this workflow with technology-specific or domain-specific rules without modifying the core principles defined here.

---

# 2. Core Principles

## 2.1. Every meaningful change has a purpose

Every meaningful change should be associated with a reason, requirement, Issue, bug, improvement, or documented task.

Minor changes, such as trivial documentation or formatting corrections, may not require an Issue.

---

## 2.2. Production code is isolated

The `main` branch represents production-ready code.

Code that is still being integrated or validated should not be placed directly on `main`.

---

## 2.3. Development is isolated

Development work should take place in dedicated working branches.

Working branches should not be used as permanent integration branches.

---

## 2.4. Integration happens through `develop`

The `develop` branch represents the integration state of the next version of the project.

Completed changes are integrated into `develop` before being promoted to `main`.

---

## 2.5. Production changes happen through controlled promotion

Normal changes should follow:

```text
working branch
      │
      ▼
   develop
      │
      ▼
    main
      │
      ▼
 production
```

A working branch should not normally be merged directly into `main`.

---

## 2.6. Pull Requests are the integration point

Changes entering protected branches should go through Pull Requests.

A Pull Request is not only a mechanism for merging code. It is also a mechanism for:

- Validation.
- Discussion.
- Review.
- Traceability.
- Documentation.

---

## 2.7. Automation validates, humans decide

Automated systems and AI may detect problems, execute checks, and provide recommendations.

Final responsibility for accepting and integrating a change remains with the project's maintainers.

---

## 2.8. Documentation is part of development

Documentation should be updated when a change modifies:

- Behavior.
- Architecture.
- Configuration.
- Public interfaces.
- Usage.
- Important project decisions.

---

## 2.9. The workflow should be reproducible

A new contributor should be able to understand how to work on the project without relying exclusively on undocumented knowledge.

---

# 3. Workflow Overview

The standard workflow is:

```text
                       ISSUE
                         │
                         ▼
                     PLANNING
                         │
                         ▼
                 WORKING BRANCH
                         │
                         ▼
                    DEVELOPMENT
                         │
                         ▼
                    VALIDATION
                         │
                         ▼
                  PULL REQUEST
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       AUTOMATED CHECKS          AI REVIEW
             │                       │
             └───────────┬───────────┘
                         ▼
                    HUMAN REVIEW
                         │
                         ▼
                      DEVELOP
                         │
                    Integration
                         │
                         ▼
                   RELEASE PR
                         │
                         ▼
                       MAIN
                         │
                         ▼
                    PRODUCTION
```

---

# 4. Branching Model

The workflow uses three logical levels of branches:

```text
main
 │
 └── Production
      │
      ▲
      │ Release
      │
develop
 │
 └── Integration
      │
      ▲
      │ Pull Requests
      │
working branches
 │
 ├── feature/*
 ├── fix/*
 ├── refactor/*
 ├── docs/*
 ├── test/*
 ├── chore/*
 └── hotfix/*
```

The standard branch model is:

| Branch | Purpose | Stability |
|---|---|---|
| `main` | Production | Production-ready |
| `develop` | Integration | Development / pre-production |
| `feature/*` | New functionality | Temporary |
| `fix/*` | Normal bug fix | Temporary |
| `refactor/*` | Refactoring | Temporary |
| `docs/*` | Documentation | Temporary |
| `test/*` | Testing changes | Temporary |
| `chore/*` | Maintenance | Temporary |
| `hotfix/*` | Critical production fix | Temporary |

---

# 5. Main Branch

The `main` branch represents the **production state** of the project.

## 5.1. Main Protection Rules

The following rules are mandatory.

### 🔴 PR Required

All normal changes entering `main` must go through a Pull Request.

### 🔴 CI Required

All mandatory CI checks must pass before a Pull Request can be merged.

### 🔴 Review Required

The Pull Request must receive the required human approval before merging.

### 🔴 Direct Push Disabled

Developers must not push directly to `main`.

### 🔴 Force Push Disabled

Force pushes to `main` are prohibited.

### 🔴 Production Promotion Required

Normal production changes must be promoted from `develop` to `main`.

Direct promotion from normal working branches to `main` is prohibited.

The standard flow is:

```text
working branch
      │
      ▼
   develop
      │
      │ Release PR
      ▼
     main
```

## 5.2. Hotfix Exception

Critical production problems may use the `hotfix/*` workflow.

A hotfix is the only normal exception to the `develop → main` promotion rule.

```text
main
 │
 └── hotfix/*
       │
       ├──────────► main
       │
       └──────────► develop
```

The hotfix must satisfy the production validation and review requirements.

After being merged into `main`, the fix must also be incorporated into `develop`.

## 5.3. Production Principle

> If a commit exists on `main`, it should be considered eligible for production.

This does not necessarily mean that every commit must be deployed immediately, but it must satisfy the project's production-readiness requirements.

---

# 6. Develop Branch

The `develop` branch represents the **integration state of the next version** of the project.

It is the destination for completed changes that have passed the project's development-level validation.

## 6.1. Rules

### 🔴 MUST

- `develop` must be protected.
- Changes should enter `develop` through Pull Requests.
- Automated checks required for integration must pass.
- Working branches should be focused on a specific logical change.
- Direct pushes should be disabled.

### 🟡 SHOULD

`develop` should remain deployable to a development, staging, or testing environment when the project's architecture supports it.

## 6.2. Purpose

`develop` allows the project to:

- Combine multiple changes.
- Detect integration problems.
- Run broader tests.
- Validate interactions between features.
- Prepare a release candidate.

---

# 7. Working Branches

Working branches are temporary branches used to implement a specific change.

Recommended categories:

```text
feature/*
fix/*
refactor/*
docs/*
test/*
chore/*
hotfix/*
```

Examples:

```text
feature/123-user-authentication
fix/241-invalid-token
refactor/87-api-client
docs/52-installation-guide
test/104-payment-validation
chore/78-update-dependencies
hotfix/301-payment-failure
```

When an Issue exists, including its identifier is recommended.

## 7.1. Rules

### 🔴 MUST

- A working branch must represent a specific logical change.
- A working branch should not contain unrelated work.
- Normal working branches must target `develop`.
- Merged branches should be deleted when no longer needed.

### 🟡 SHOULD

Branch names should clearly communicate:

1. Purpose.
2. Related Issue, when applicable.
3. Short description.

---

# 8. Hotfix Branches

A `hotfix/*` branch is used when a critical problem must be fixed directly from the production state.

Example:

```text
main
 │
 └── hotfix/301-payment-failure
```

The hotfix follows a special flow:

```text
                  main
                   │
                   ▼
               hotfix/*
                │   │
                │   │
                ▼   ▼
              main develop
```

## 8.1. Rules

### 🔴 MUST

A hotfix merged into `main` must also be incorporated into `develop`.

### 🔴 MUST

The hotfix must pass the same production validation required for changes entering `main`.

### 🔴 MUST

The Pull Request must clearly identify that it is a hotfix.

### 🟡 SHOULD

The hotfix should be associated with an Issue describing:

- The production problem.
- Impact.
- Root cause, when known.
- Resolution.
- Validation performed.

---

# 9. Branch Promotion Rules

The following promotion rules are mandatory.

## 9.1. Normal Changes

```text
feature/* ──┐
fix/* ──────┤
refactor/* ─┤
docs/* ─────┤──► develop ──► main
test/* ─────┤
chore/* ────┘
```

### 🔴 MUST

Normal working branches must not be merged directly into `main`.

---

## 9.2. Production Promotion

```text
develop
   │
   │ Release PR
   ▼
 main
```

### 🔴 MUST

Normal production promotion must originate from `develop`.

---

## 9.3. Hotfix

```text
hotfix/*
   │
   ├────────► main
   │
   └────────► develop
```

### 🔴 MUST

A hotfix must be propagated to both protected branches.

---

# 10. Issues

Issues describe **what needs to be done and why**.

They should focus on the problem or desired outcome rather than prescribing implementation details unnecessarily.

## 10.1. Issue Types

Projects may use:

- `Feature`
- `Bug`
- `Task`
- `Improvement`
- `Documentation`
- `Research`
- `Chore`

Projects may define additional categories.

## 10.2. Issue Requirements

A meaningful Issue should answer:

```text
What needs to be changed?
Why is the change necessary?
What is the expected result?
How can completion be verified?
```

For larger changes, the Issue should also identify:

- Dependencies.
- Constraints.
- Risks.
- Relevant documentation.
- Related Issues.

---

# 11. Planning

Before implementation begins, the contributor should understand:

```text
Requirement
    │
    ├── Scope
    ├── Constraints
    ├── Dependencies
    ├── Risks
    └── Expected Result
```

The contributor should review relevant project documentation before modifying existing systems.

For complex work, planning should be documented in the Issue or an associated design document.

---

# 12. Commits

Commits should represent coherent changes.

A commit should:

- Have a clear purpose.
- Contain related changes only.
- Be understandable.
- Avoid unrelated formatting or refactoring.

## 12.1. Conventional Commits

The recommended commit convention is **Conventional Commits**.

Examples:

```text
feat: add user authentication
fix: handle expired sessions
refactor: simplify API client
test: add authentication tests
docs: update installation guide
chore: update dependencies
```

### 🟡 SHOULD

Projects should use Conventional Commits when practical.

### 🔴 MUST

Regardless of the convention used, commit messages must be meaningful and descriptive.

---

# 13. Development

The recommended development sequence is:

```text
1. Understand the Issue
2. Review project context
3. Identify dependencies and constraints
4. Create working branch
5. Implement the change
6. Add or update tests
7. Update documentation when necessary
8. Run local validation
9. Commit changes
10. Push branch
11. Open Pull Request
```

Developers should avoid implementing changes without first understanding the existing project context.

---

# 14. Definition of Done

A task should not be considered complete merely because the implementation works locally.

## 14.1. Core Definition of Done

The following baseline applies to all projects:

```text
[ ] Requirement understood
[ ] Implementation completed
[ ] Relevant tests considered
[ ] Validation executed
[ ] Documentation updated when necessary
[ ] Pull Request created
[ ] Required automated checks pass
[ ] Required review completed
```

## 14.2. Project Definition of Done

Projects may add requirements such as:

```text
[ ] Security checks completed
[ ] Coverage requirement satisfied
[ ] Database migration tested
[ ] E2E tests completed
[ ] Performance requirements verified
[ ] Deployment verified
```

Project-specific requirements must be documented separately.

---

# 15. Testing and Quality

Every project must define the validation appropriate for its technology and risk level.

Possible validation categories include:

```text
Build
Tests
Linting
Formatting
Static Analysis
Security
Dependency Analysis
Performance
Documentation
```

Not every project requires every category.

The project must define which checks are mandatory.

---

# 16. Quality Gates

Quality gates determine whether a change is allowed to progress.

## 16.1. Development Gate

Before merging into `develop`:

```text
Working Branch
      │
      ▼
Development Validation
      │
      ├── Required tests
      ├── Required analysis
      ├── Required build
      └── Other project checks
             │
             ▼
          PASS
             │
             ▼
          develop
```

## 16.2. Production Gate

Before merging into `main`:

```text
develop
   │
   ▼
Release Validation
   │
   ├── Required tests
   ├── Integration validation
   ├── Security checks
   ├── Release checks
   └── Project-specific checks
          │
          ▼
        PASS
          │
          ▼
         main
```

Production gates should generally be stricter than development gates.

---

# 17. Pull Requests

Pull Requests are the primary integration mechanism.

A Pull Request should provide enough context for another contributor to understand the change.

## 17.1. Required Information

A Pull Request should contain:

```text
Description
Related Issue
Changes
Validation
Additional Notes
```

## 17.2. Pull Request Flow

### Working branch → `develop`

Used for normal development changes.

```text
feature/*
fix/*
refactor/*
      │
      ▼
     PR
      │
      ▼
   develop
```

### `develop` → `main`

Used to promote an integrated version toward production.

```text
develop
   │
   ▼
Release PR
   │
   ▼
 main
```

### `hotfix/*` → `main` and `develop`

Used only for critical production fixes.

---

# 18. Code Review

Code review should evaluate more than whether the code compiles.

Reviewers should consider:

### Correctness

Does the implementation satisfy the requirement?

### Maintainability

Is the code understandable and maintainable?

### Architecture

Does the change respect the project's architectural principles?

### Testing

Are relevant scenarios covered?

### Security

Does the change introduce avoidable security risks?

### Performance

Does the change introduce relevant performance problems?

### Documentation

Is the project documentation still accurate?

### Scope

Does the Pull Request contain unnecessary changes?

Review comments should be actionable and focused on the code rather than personal preferences.

---

# 19. Automated Checks

Automated checks should run before merging into protected branches.

A generic CI pipeline may look like:

```text
Pull Request
     │
     ▼
  Checkout
     │
     ▼
  Setup
     │
     ├── Build
     ├── Tests
     ├── Lint
     ├── Static Analysis
     └── Security
             │
             ▼
           Result
         ┌───┴───┐
         ▼       ▼
       PASS     FAIL
         │       │
         ▼       ▼
      Review    Fix
```

### 🔴 MUST

Every project must define its mandatory automated checks.

### 🔴 MUST

Mandatory checks must prevent integration when they fail.

---

# 20. AI-Assisted Development

AI may be used as a development assistant.

Possible roles include:

```text
Planner
Developer
Tester
Reviewer
Documentation Assistant
Research Assistant
Debugger
Refactoring Assistant
```

## 20.1. AI Principle

> **AI is advisory by default.**

AI-generated output must be treated as assistance and not as authoritative project decisions.

## 20.2. AI Responsibilities

AI may:

- Analyze requirements.
- Suggest implementations.
- Generate code.
- Generate tests.
- Identify potential bugs.
- Review Pull Requests.
- Suggest documentation.
- Summarize project context.
- Assist with debugging.

## 20.3. Human Responsibilities

Humans remain responsible for:

- Requirements.
- Architectural decisions.
- Security-sensitive decisions.
- Reviewing AI-generated code.
- Verifying generated information.
- Approving changes.
- Final merge decisions.

## 20.4. AI Changes

AI should not directly modify protected branches.

Recommended flow:

```text
Human / Issue
      │
      ▼
AI Assistance
      │
      ▼
Working Branch
      │
      ▼
Automated Validation
      │
      ▼
Pull Request
      │
      ▼
Human Review
      │
      ▼
Integration
```

---

# 21. Project Context

Important project knowledge should be stored in the repository whenever practical.

Recommended structure:

```text
docs/
│
├── decisions/
├── architecture/
└── guides/
```

A project may also maintain:

```text
PROJECT_CONTEXT.md
```

Possible contents:

```text
Project purpose
Technology stack
Architecture overview
Development conventions
Important terminology
Known limitations
External dependencies
Important decisions
```

This information should be useful to both humans and AI-assisted tools.

---

# 22. Architecture Decisions

Important technical decisions should be documented rather than existing only in conversations or meetings.

Recommended structure:

```text
docs/decisions/
├── 001-database-selection.md
├── 002-authentication-strategy.md
└── 003-api-versioning.md
```

A decision record should preferably contain:

```text
Context
Problem
Options considered
Decision
Consequences
```

---

# 23. Traceability

Important work should be traceable throughout the development lifecycle.

The recommended chain is:

```text
Requirement
     │
     ▼
Issue
     │
     ▼
Working Branch
     │
     ▼
Commit
     │
     ▼
Pull Request
     │
     ▼
Tests / Validation
     │
     ▼
develop
     │
     ▼
Release
     │
     ▼
main
     │
     ▼
Production
```

Not every project requires complete traceability at every level.

However, critical systems should favor stronger traceability.

---

# 24. Releases

When a project uses versioned releases, releases should be reproducible and documented.

A release may contain:

```text
Version
Changes
Bug fixes
Breaking changes
Migration instructions
Known issues
```

The release process should generally follow:

```text
develop
   │
   ▼
Release Candidate
   │
   ▼
Release Validation
   │
   ▼
Release PR
   │
   ▼
main
   │
   ▼
Production
```

Projects may automate versioning and changelog generation.

---

# 25. Protected Branch Configuration

The minimum recommended protection for the two protected branches is:

## `main`

```text
┌────────────────────────────────────┐
│          MAIN — PRODUCTION         │
├────────────────────────────────────┤
│ PR required                 🔴     │
│ CI required                 🔴     │
│ Review required             🔴     │
│ Direct push disabled        🔴     │
│ Force push disabled         🔴     │
│ Normal promotion from       🔴     │
│ develop only                       │
└────────────────────────────────────┘
```

Normal flow:

```text
develop ──────► Release PR ──────► main
```

Exception:

```text
hotfix/* ─────► main
     │
     └─────────► develop
```

## `develop`

```text
┌────────────────────────────────────┐
│         DEVELOP — INTEGRATION      │
├────────────────────────────────────┤
│ PR required                 🔴     │
│ CI required                 🔴     │
│ Direct push disabled        🔴     │
│ Force push disabled         🔴     │
└────────────────────────────────────┘
```

The recommended number of required reviewers is:

- `main`: **2 approvals**
- `develop`: **1 approval**

Projects may change these values according to their risk level and team size. Self-merge by the author is discouraged on both protected branches.

---

# 26. Repository Structure

The structure shipped by this template is:

```text
.github/
│
├── WORKFLOW.md
│
├── pull_request_template.md
│
├── ISSUE_TEMPLATE/
│   ├── feature.md
│   ├── bug.md
│   ├── task.md
│   └── research.md
│
├── workflows/
│   ├── ci.yml
│   └── branch-policy.yml
│
└── CODEOWNERS

scripts/
│
└── ci.sh

.gitignore
README.md
```

Documentation may be organized as:

```text
docs/
│
├── decisions/
├── architecture/
└── guides/
```

Optional automation (`security.yml`, `ai-review.yml`, `release.yml`) is not part of the core template. Projects may add it as an extension — see §28.

---

# 27. Automation Architecture

The core automation is divided according to responsibility:

```text
.github/workflows/
│
├── ci.yml
│     └── Build / Test / Quality (delegates to scripts/ci.sh)
│
└── branch-policy.yml
      └── Branch flow validation
```

The following workflows are **optional project extensions**, not part of the core template:

```text
security.yml     ── Security validation
ai-review.yml    ── AI-assisted review
release.yml      ── Release automation
```

When the same workflow is used by multiple repositories, reusable workflows may be preferred.

This avoids duplicating logic across projects.

---

# 28. Project Extensions

This workflow defines a **core process**, not every possible project-specific rule.

Projects may extend it with additional requirements.

Example:

```text
Core Workflow
     │
     ├── Web Application
     │      └── Browser testing
     │
     ├── Mobile Application
     │      └── Device testing
     │
     ├── Data Project
     │      └── Data validation
     │
     ├── Infrastructure
     │      └── Deployment validation
     │
     └── Domain-specific Project
            └── Domain-specific rules
```

Project-specific extensions should not contradict the core workflow unless explicitly justified.

---

# 29. Exceptions

Projects may require deviations from the standard workflow.

Exceptions should be:

- Explicit.
- Justified.
- Documented when significant.
- Approved by the appropriate maintainer.

An exception should not silently become the new standard.

The `hotfix/*` workflow is a predefined exception to the normal `develop → main` promotion rule.

If another exception is required, it should be documented.

If the same exception occurs repeatedly, the workflow should be reconsidered.

---

# 30. Continuous Improvement

This workflow is a living document.

Projects should periodically evaluate:

```text
What works?
What creates unnecessary friction?
What causes repeated errors?
What can be automated?
What should be documented?
What should be removed?
```

Changes to the workflow should themselves follow the workflow:

```text
Issue
  ↓
Working Branch
  ↓
Change
  ↓
Pull Request
  ↓
Review
  ↓
develop
  ↓
main
```

---

# 31. Workflow Policy Matrix

The following policies define the core workflow.

| ID | Rule | Level | Responsible | Automation | Blocks Merge |
|---|---|---|---|---|---|
| WF-001 | `main` represents production-ready code | MUST | Maintainer | Partial | Yes |
| WF-002 | `main` is protected | MUST | Maintainer | Yes | Yes |
| WF-003 | Direct development on `main` is prohibited | MUST | Developer | Yes | Yes |
| WF-004 | `develop` is the integration branch | MUST | Maintainer | Partial | Yes |
| WF-005 | Normal changes flow through `working → develop → main` | MUST | Developer/Maintainer | Partial | Yes |
| WF-006 | Working branches represent a logical change | MUST | Developer | Partial | Configurable |
| WF-007 | Significant changes have an Issue or equivalent context | MUST | Developer | Partial | Configurable |
| WF-008 | Commits must be meaningful | MUST | Developer | Yes | Configurable |
| WF-009 | Conventional Commits are recommended | SHOULD | Developer | Yes | No |
| WF-010 | Relevant validation must be executed | MUST | Developer/CI | Yes | Yes |
| WF-011 | Mandatory CI checks must pass | MUST | CI | Yes | Yes |
| WF-012 | Protected branches require Pull Requests | MUST | GitHub | Yes | Yes |
| WF-013 | Pull Requests must provide change context | MUST | Developer | Partial | Configurable |
| WF-014 | Required code review must be completed | MUST | Reviewer | Yes | Yes |
| WF-015 | Normal production promotion occurs through `develop → main` | MUST | Maintainer | Partial | Yes |
| WF-016 | Hotfixes merged into `main` must be incorporated into `develop` | MUST | Maintainer | Partial | Yes |
| WF-017 | AI cannot be the sole approval authority | MUST | Maintainer | Partial | Yes |
| WF-018 | AI-generated code follows the same validation process | MUST | Developer/CI | Yes | Yes |
| WF-019 | Important technical decisions should be documented | SHOULD | Developer/Maintainer | Partial | No |
| WF-020 | Project-specific quality gates must be documented | MUST | Maintainer | Partial | Yes |
| WF-021 | Significant exceptions must be documented | MUST | Maintainer | No | No |
| WF-022 | The workflow should be continuously improved | SHOULD | Project Team | No | No |
| WF-023 | `main` accepts normal production promotions only from `develop` | MUST | GitHub/CI | Yes | Yes |

---

# 32. Quick Reference

## Normal Feature

```text
Issue
  ↓
feature/*
  ↓
Development
  ↓
Tests
  ↓
Pull Request
  ↓
develop
  ↓
Integration
  ↓
Release PR
  ↓
main
  ↓
Production
```

## Bug Fix

```text
Issue
  ↓
fix/*
  ↓
Development
  ↓
Pull Request
  ↓
develop
  ↓
Release
  ↓
main
```

## Production Hotfix

```text
Production Problem
       ↓
     Issue
       ↓
   hotfix/*
       │
       ├──────► main
       │
       └──────► develop
```

---

# 33. Golden Rules

```text
┌───────────────────────────────────────────────┐
│  1. main represents production.              │
│  2. develop represents integration.          │
│  3. Do not develop directly on protected      │
│     branches.                                │
│  4. Normal changes flow through               │
│     working → develop → main.                │
│  5. main requires a Pull Request.            │
│  6. main requires passing CI.                │
│  7. main requires human review.              │
│  8. Direct and force pushes to main are      │
│     prohibited.                              │
│  9. Normal promotion to main comes from      │
│     develop.                                 │
│ 10. Hotfixes must return to develop.         │
│ 11. Every meaningful change has a purpose.   │
│ 12. Keep changes focused.                    │
│ 13. Validate before integrating.             │
│ 14. AI assists; humans remain responsible.   │
│ 15. Document important decisions.             │
│ 16. Automate repetitive validation.           │
│ 17. Improve the workflow continuously.        │
└───────────────────────────────────────────────┘
```

---

# 34. References

## GitHub

- GitHub Pull Requests
- GitHub Actions
- Protected Branches
- Status Checks
- Issue and Pull Request Templates
- Reusable Workflows
- CODEOWNERS

## Standards and Practices

- Conventional Commits
- Architecture Decision Records

## Reference Projects

- Gentleman.Dots
- Gentleman-Skills
- gentleman-guardian-angel
- gentle-ai
- engram
```
