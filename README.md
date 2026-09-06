# Estructura

Reusable GitHub workflow template for any software project.

## What's included

```
.github/
├── WORKFLOW.md                     Full workflow definition (branching model, quality gates, review, releases)
├── ISSUE_TEMPLATE/                 Feature, bug, task, research templates
├── pull_request_template.md
├── workflows/
│   ├── ci.yml                      Runs scripts/ci.sh
│   └── branch-policy.yml           Validates branch flow (working → develop → main, hotfix rules)
└── CODEOWNERS                      Sample code owners

scripts/
└── ci.sh                           Project CI entry point (configure it!)

.gitignore
```

## Set up a new repository

1. Copy these files into the new repository.
2. Create the `develop` branch from `main` and push it (`git branch develop && git push -u origin develop`).
3. Edit `scripts/ci.sh` with the project's mandatory checks (build, tests, lint). It fails by default on purpose — see the file comments.
4. Edit `.github/CODEOWNERS` with the real owners.
5. Configure GitHub branch protection (manual, cannot be versioned): for both `main` and `develop`, require pull requests, require status checks `CI` and `Branch Policy`, disable direct push, force push, and branch deletion. Default required approvals: 2 for `main`, 1 for `develop`. See WORKFLOW.md §25.
6. Optional per project: add `security.yml`, `ai-review.yml`, `release.yml` workflows.

## Workflow summary

- `main` = production (protected)
- `develop` = integration
- Working branches (feature/fix/refactor/docs/test/chore/hotfix) flow working → develop → main; `hotfix/*` may target main and must also merge to develop.

See [.github/WORKFLOW.md](.github/WORKFLOW.md) for the full definition.
