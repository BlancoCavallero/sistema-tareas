#!/usr/bin/env bash
# Generic CI entry point for the project template.
#
# Replace the run_checks() function below with your project's mandatory
# checks (build, tests, lint, static analysis, security...).
#
# It fails by default on purpose: a silently green CI is worse than a
# failing one that tells you what to configure. Do NOT delete the failure
# path without defining real checks.
set -euo pipefail

# --- Project checks ---------------------------------------------------------
# Uncomment and adapt to your stack. Examples:
#   Node:    npm ci && npm run build && npm test && npm run lint
#   Python:  python -m pip install -e . && pytest
#   .NET:    dotnet build --nologo && dotnet test --nologo
#   Go:      go build ./... && go test ./...
run_checks() {
  echo "::error::scripts/ci.sh is not configured. Edit it to run the project's mandatory checks (see WORKFLOW.md, sections 15-16)."
  exit 1
}
# ----------------------------------------------------------------------------

run_checks
