#!/usr/bin/env bash
# The check after a release build (.github/workflows/package.yml): the app in
# the release directory, and the app inside the update .zip that
# electron-updater installs, must each carry a valid signature that
# Gatekeeper accepts as a notarized Developer ID, with the notarization ticket
# stapled. Any failure exits non-zero, and the workflow publishes nothing.
#
# Usage: bash cli/verify-release.sh [release directory, default release]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$ROOT/release}"
VERSION="$(node -p "require('$ROOT/package.json').version")"
APP="$DIR/mac-universal/Record.app"
ZIP="$DIR/Record-$VERSION-universal-mac.zip"

verify_app() {
  local app="$1"
  echo "verifying $app"
  codesign --verify --deep --strict --verbose=2 "$app"
  local assessment
  assessment="$(spctl --assess --type execute --verbose=4 "$app" 2>&1)" || true
  echo "$assessment"
  if ! grep -q 'source=Notarized Developer ID' <<<"$assessment"; then
    echo "FAIL: Gatekeeper does not accept $app as a notarized Developer ID app" >&2
    exit 1
  fi
  xcrun stapler validate "$app"
}

verify_app "$APP"

UNZIPPED="$(mktemp -d)"
trap 'rm -rf "$UNZIPPED"' EXIT
ditto -x -k "$ZIP" "$UNZIPPED"
verify_app "$UNZIPPED/Record.app"

echo "release signature verified"
