// Installing a staged update (spec §8.2.5): never while the app runs. At the
// user's quit, a detached helper waits for the app's process to exit, copies
// the staged bundle beside the installed one, then swaps the two by rename in
// the same directory, putting the old bundle back if the second rename fails,
// and removes the old one. The app is not relaunched; the user's next launch
// opens the new version. The staged bundle was fetched by the app itself, so
// it carries no quarantine and opens without a Gatekeeper prompt.
//
// A copy of the app that cannot replace itself reports why at startup, and
// updates stay off, rather than failing at quit: one macOS runs translocated
// from a quarantined download, one on a read-only volume such as its disk
// image, or one in a directory the user cannot write.
//
// Nothing here imports Electron, so tests drive it under Bun.

import { spawn as node_spawn } from 'node:child_process'
import { constants, accessSync, closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname } from 'node:path'

// The .app bundle holding an executable, or null when it is not in one.
export const app_bundle_path = (exec_path: string): string | null => {
  const match = /^(.*?\.app)\/Contents\/MacOS\/[^/]+$/.exec(exec_path)
  return match === null ? null : match[1] as string
}

const MOVE_TO_APPLICATIONS = 'Move Record to the Applications folder and open it from there to get updates.'

export const install_unavailable_reason = ({ platform, app_path, access = accessSync }: {
  platform: string
  app_path: string | null
  access?: (path: string, mode: number) => void
}): string | null => {
  if (platform !== 'darwin') return 'Updates install only on macOS.'
  if (app_path === null) return 'Updates install only in the packaged app.'
  if (app_path.includes('/AppTranslocation/')) return `macOS is running Record from a temporary read-only copy. ${MOVE_TO_APPLICATIONS}`
  for (const path of [dirname(app_path), app_path]) {
    try {
      access(path, constants.W_OK)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'EROFS') return `Record is running from a read-only volume, such as its disk image. ${MOVE_TO_APPLICATIONS}`
      return `Record cannot replace itself in ${dirname(app_path)}. ${MOVE_TO_APPLICATIONS}`
    }
  }
  return null
}

// $1 the app's pid, $2 the installed bundle, $3 the staged bundle.
export const SWAP_SCRIPT = `set -u
pid="$1"; app="$2"; staged="$3"
dir="$(dirname "$app")"; name="$(basename "$app")"
new="$dir/.$name.update-$$"; old="$dir/.$name.old-$$"
while kill -0 "$pid" 2>/dev/null; do sleep 0.5; done
rm -rf "$new"
ditto "$staged" "$new" || { rm -rf "$new"; echo "copy failed"; exit 1; }
mv "$app" "$old" || { rm -rf "$new"; echo "could not move the installed app aside"; exit 1; }
mv "$new" "$app" || { mv "$old" "$app"; rm -rf "$new"; echo "swap failed, kept the installed app"; exit 1; }
rm -rf "$old" "$staged"
echo "installed"
`

export const spawn_swap_helper = ({ pid, app_path, staged_app_path, log_path, spawn = node_spawn }: {
  pid: number
  app_path: string
  staged_app_path: string
  log_path: string
  spawn?: typeof node_spawn
}): void => {
  mkdirSync(dirname(log_path), { recursive: true })
  const log = openSync(log_path, 'a', 0o600)
  try {
    const child = spawn('/bin/sh', ['-c', SWAP_SCRIPT, 'record-update', String(pid), app_path, staged_app_path], { detached: true, stdio: ['ignore', log, log] })
    child.unref()
  } finally {
    closeSync(log)
  }
}
