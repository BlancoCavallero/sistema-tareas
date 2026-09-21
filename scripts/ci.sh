#!/usr/bin/env bash
# CI entry point: dependency install, lint, test, build — fail on first error.
#
# Guard: refuse to run while `origin` still points at the template repository
# (BlancoCavallero/Estructura.git). Pushing to that repo by accident would be
# the failure mode this guard exists to prevent.
set -euo pipefail

TPL="https://github.com/BlancoCavallero/Estructura.git"
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"

if [ -z "$ORIGIN_URL" ] || [ "$ORIGIN_URL" = "$TPL" ]; then
	echo "::error::origin still points at template"
	exit 1
fi

npm ci
npm run lint
npm run test
npm run build