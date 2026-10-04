#!/usr/bin/env bash
# The check after a release build (.github/workflows/package.yml). Three
# copies of the app must each carry a valid, sealed ad-hoc signature and no
# signing identity, so no certificate, and no name, ships in the app:
# - the app in the release directory;
# - the app on the .dmg users download;
# - the app inside the update .zip.
# A broken seal matters: macOS reports a downloaded app whose signature does
# not verify as damaged, with no way to open it. Any failure exits non-zero,
# and the workflow publishes nothing.
#
# Usage: bash cli/verify-release.sh [release directory, default release]

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-$ROOT/release}"
VERSION="$(node -p "require('$ROOT/package.json').version")"
DMG="$DIR/Record-$VERSION-universal.dmg"
ZIP="$DIR/Record-$VERSION-universal-mac.zip"

verify_app() {
  local app="$1" details
  echo "verifying $app"
  if ! codesign --verify --deep --strict --verbose=2 "$app"; then
    echo "FAIL: $app has a signature that does not verify" >&2
    exit 1
  fi
  details="$(codesign --display --verbose=2 "$app" 2>&1)"
  if ! grep -qx 'Signature=adhoc' <<<"$details" || grep -q '^Authority=' <<<"$details"; then
    echo "FAIL: $app is not ad-hoc signed, or carries a signing identity" >&2
    exit 1
  fi
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
