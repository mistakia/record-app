// Over-the-air updates (spec §8.2.5, §8.10.10), off until a release feed
// exists: with no feed URL the service never creates a backend, so nothing
// contacts a network. With one, it checks at startup and every 4 hours,
// downloads in the background, and leaves the install to the next quit the
// user makes; it never restarts the app itself. A newer major version waits
// for the user's opt-in, and an older one is never taken.
//
// The backend is injected: electron-updater (with Squirrel.Mac verifying the
// payload's Developer ID signature) is added once the feed and signing exist.

export type UpdateChannel = 'stable' | 'beta'

// The release feed (an https URL), or null while updates are off.
export const UPDATE_FEED_URL: string | null = null

export const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

export interface UpdateBackend {
  // The newest release on the channel, or null when there is none.
  check: () => Promise<{ version: string } | null>
  // Fetches the release found by the last check; the backend installs it
  // when the app quits.
  download: () => Promise<void>
}

export type UpdateStatus =
  | { status: 'off', reason: string }
  | { status: 'idle', checked_at_ms: number | null }
  | { status: 'downloading', version: string }
  | { status: 'ready', version: string }
  | { status: 'major_available', version: string }
  | { status: 'error', message: string }

// Semantic Versioning 2.0.0 §11 precedence: build metadata is ignored; the
// core compares numerically; a release outranks its own prereleases; and
// prerelease identifiers compare left to right, numeric ones numerically and
// below alphanumeric ones, which compare in ASCII order, with a shorter
// equal-prefix list lower.
const parse_version = (version: string): { core: number[], prerelease: string[] } => {
  const [without_build = ''] = version.trim().replace(/^v/, '').split('+')
  const dash = without_build.indexOf('-')
  const core = (dash === -1 ? without_build : without_build.slice(0, dash)).split('.').map((part) => Number.parseInt(part, 10) || 0)
  return { core, prerelease: dash === -1 ? [] : without_build.slice(dash + 1).split('.') }
}

const NUMERIC = /^\d+$/

const compare_identifiers = (a: string, b: string): number => {
  const [a_numeric, b_numeric] = [NUMERIC.test(a), NUMERIC.test(b)]
  if (a_numeric && b_numeric) return Number(a) - Number(b)
  if (a_numeric !== b_numeric) return a_numeric ? -1 : 1
  return a < b ? -1 : a > b ? 1 : 0
}

export const compare_versions = (a: string, b: string): number => {
  const [left, right] = [parse_version(a), parse_version(b)]
  for (let index = 0; index < 3; index++) {
    const difference = (left.core[index] ?? 0) - (right.core[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) return Math.sign(right.prerelease.length - left.prerelease.length)
  for (let index = 0; index < Math.min(left.prerelease.length, right.prerelease.length); index++) {
    const order = compare_identifiers(left.prerelease[index] as string, right.prerelease[index] as string)
    if (order !== 0) return Math.sign(order)
  }
  return Math.sign(left.prerelease.length - right.prerelease.length)
}

const major = (version: string): number => parse_version(version).core[0] ?? 0

const newer = (a: string, b: string): boolean => compare_versions(a, b) > 0

export const create_update_service = ({ feed_url, channel, current_version, create_backend, now = Date.now, set_interval = setInterval, clear_interval = clearInterval }: {
  feed_url: string | null
  channel: UpdateChannel
  current_version: string
  create_backend: (input: { feed_url: string, channel: UpdateChannel }) => UpdateBackend
  now?: () => number
  set_interval?: (run: () => void, ms: number) => unknown
  clear_interval?: (timer: never) => void
}) => {
  let state: UpdateStatus = feed_url === null
    ? { status: 'off', reason: 'No update feed is configured.' }
    : !feed_url.startsWith('https://')
        ? { status: 'off', reason: 'The update feed is not an https URL.' }
        : { status: 'idle', checked_at_ms: null }
  let backend: UpdateBackend | null = null
  let timer: unknown = null
  let running = false

  const check = async (): Promise<void> => {
    if (backend === null || running || state.status === 'ready' || state.status === 'downloading') return
    running = true
    try {
      const found = await backend.check()
      if (found === null || !newer(found.version, current_version)) {
        state = { status: 'idle', checked_at_ms: now() }
      } else if (major(found.version) > major(current_version)) {
        state = { status: 'major_available', version: found.version }
      } else {
        state = { status: 'downloading', version: found.version }
        await backend.download()
        state = { status: 'ready', version: found.version }
      }
    } catch (error) {
      state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
    } finally {
      running = false
    }
  }

  return {
    get_state: (): UpdateStatus => state,
    start: (): void => {
      if (state.status === 'off' || feed_url === null || backend !== null) return
      try {
        backend = create_backend({ feed_url, channel })
      } catch (error) {
        state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
        return
      }
      check().catch(() => {})
      timer = set_interval(() => { check().catch(() => {}) }, CHECK_INTERVAL_MS)
    },
    // The user's opt-in to a newer major version.
    accept_major: async (): Promise<void> => {
      if (backend === null || state.status !== 'major_available') return
      const { version } = state
      state = { status: 'downloading', version }
      try {
        await backend.download()
        state = { status: 'ready', version }
      } catch (error) {
        state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
      }
    },
    stop: (): void => {
      if (timer !== null) clear_interval(timer as never)
      timer = null
    }
  }
}
