#!/usr/bin/env bash
# check-build.sh — install and test the runnable minimal example.
#
# The install skips the Electron binary on purpose: the example's test suite
# runs on the pure ViewModel with node:test, so the gate works without
# downloading ~100 MB of Chromium. A missing node/npm is a visible SKIP,
# never a silent pass; CI installs both and runs the same script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/examples/minimal"

if ! command -v node >/dev/null 2>&1; then
  echo "check-build: SKIP — node not found"
  exit 0
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "check-build: SKIP — npm not found"
  exit 0
fi

export ELECTRON_SKIP_BINARY_DOWNLOAD=1
npm install --ignore-scripts --no-audit --no-fund --loglevel=error
npm test
echo "check-build: OK"
