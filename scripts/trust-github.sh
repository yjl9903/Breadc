#!/usr/bin/env bash
set -euo pipefail

WORKFLOW_FILE="release.yml"
REPO="yjl9903/breadc"
PACKAGES=(
  "breadc"
  "@breadc/color"
  "@breadc/complete"
  "@breadc/core"
  "@breadc/death"
  "@breadc/tui"
)

for pkg in "${PACKAGES[@]}"; do
  echo "Config trust for $pkg"
  mise exec npm@latest -- npm trust github "$pkg" --repo "$REPO" --file "$WORKFLOW_FILE" --yes
  sleep 2
done