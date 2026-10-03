// The bundled node's environment, from an allowlist rather than the app's
// own: a developer's NODE_OPTIONS (an --inspect, a --require) must never
// reach a process holding the private key. record-node itself reads only
// RECORD_CONFIG, which the app replaces with --config. YTDLP_PATH stays out:
// the bundled node runs no yt-dlp (its config names one that cannot exist).
// Imports nothing from Electron.

const ALLOWED = new Set(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ', 'USER', 'LOGNAME'])

export const build_child_env = (parent: NodeJS.ProcessEnv): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const [name, value] of Object.entries(parent)) {
    if (value === undefined) continue
    if (ALLOWED.has(name) || name.startsWith('LC_')) env[name] = value
  }
  return env
}
