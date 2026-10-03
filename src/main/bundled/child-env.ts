// The bundled node's environment, from an allowlist rather than the app's
// own: a developer's NODE_OPTIONS (an --inspect, a --require) must never
// reach a process holding the private key. record-node itself reads only
// RECORD_CONFIG, which the app replaces with --config; record-resolver reads
// YTDLP_PATH; ffmpeg, fpcalc, and yt-dlp are found on PATH. Imports nothing
// from Electron.

const ALLOWED = new Set(['PATH', 'HOME', 'TMPDIR', 'LANG', 'TZ', 'USER', 'LOGNAME', 'YTDLP_PATH'])

export const build_child_env = (parent: NodeJS.ProcessEnv): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const [name, value] of Object.entries(parent)) {
    if (value === undefined) continue
    if (ALLOWED.has(name) || name.startsWith('LC_')) env[name] = value
  }
  return env
}
