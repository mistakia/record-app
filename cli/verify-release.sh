#!/usr/bin/env bash
# The check after a release build (.github/workflows/package.yml). Three
# copies of the app must each carry a valid Developer ID Application
# signature that Apple has notarized, with the notarization ticket stapled:
# - the app in the release directory;
# - the app on the .dmg users download;
# - the app inside the update .zip that electron-updater installs.
# The requirement is checked with codesign, which does not depend on
# Gatekeeper assessments being enabled on the runner; spctl's verdict is
# printed alongside. Any failure exits non-zero, and the workflow publishes
# nothing.
#
# Usage: bash cli/verify-release.sh [release directory, default release]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$ROOT/release}"
VERSION="$(node -p "require('$ROOT/package.json').version")"
DMG="$DIR/Record-$VERSION-universal.dmg"
ZIP="$DIR/Record-$VERSION-universal-mac.zip"

# Notarized, chained to Apple, and signed by a Developer ID Application
# certificate (the Developer ID CA and leaf marker OIDs). Without the
# parentheses codesign rejects some notarized Developer ID apps.
REQUIREMENT='=notarized and (anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] exists and certificate leaf[field.1.2.840.113635.100.6.1.13] exists)'

verify_app() {
  local app="$1"
  echo "verifying $app"
  if ! codesign --verify --deep --strict --verbose=2 --test-requirement="$REQUIREMENT" "$app"; then
    echo "FAIL: $app is not signed by a notarized Developer ID Application identity" >&2
    exit 1
  fi
  xcrun stapler validate "$app"
  spctl --assess --type execute --verbose=4 "$app" 2>&1 || true
}

WORK="$(mktemp -d)"
MOUNT="$WORK/dmg"
cleanup() {
  hdiutil detach "$MOUNT" -quiet 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

verify_app "$DIR/mac-universal/Record.app"

mkdir "$MOUNT"
hdiutil attach "$DMG" -nobrowse -readonly -mountpoint "$MOUNT" -quiet
verify_app "$MOUNT/Record.app"

ditto -x -k "$ZIP" "$WORK/zip"
verify_app "$WORK/zip/Record.app"

echo "release signature verified"
