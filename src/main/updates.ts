// Over-the-air updates (spec §8.2.5, §8.10.10), off until both a release feed
// and the pinned update key are set: without them the service never creates a
// backend, so nothing contacts a network. With them, it checks at startup and
// every 4 hours, downloads and stages in the background, and installs at the
// next quit the user makes; it never restarts the app itself. A newer major
// version waits for the user's opt-in, and an older one is never taken.
//
// The backend is injected: update-backend.ts reads GitHub Releases and stages
// an update only after its signed manifest verifies against the pinned key
// (update-signature.ts), and update-install.ts swaps the bundle once the app
// has exited.

import type { UpdateChannel } from '#shared/bridge.ts'

export type { UpdateChannel } from '#shared/bridge.ts'

// The release feed, the GitHub repository whose releases carry it.
export const UPDATE_FEED_URL = 'https://github.com/mistakia/record-app'

// The project's Ed25519 update public key, raw 32 bytes in base64, as
// `node cli/update-signing-key.ts generate` printed it. Its private half is the
// UPDATE_SIGNING_KEY repository secret.
export const UPDATE_PUBLIC_KEY = 'FlkOlLO5fz5m92HVHVRM2XKIDjiR//0o7TVh8mHKIEY='

export const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

export interface UpdateBackend {
  // The newest release on the channel, or null when there is none.
  check: () => Promise<{ version: string } | null>
  // Fetches, verifies, and stages the release found by the last check.
  download: () => Promise<void>
  // Hands the staged release to a helper that swaps it in once the app has
  // exited. Called at most once, at quit, and only after a download.
  install: () => void
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

export const create_update_service = ({ feed_url, public_key, unavailable_reason = null, channel: initial_channel, current_version, create_backend, now = Date.now, set_interval = setInterval, clear_interval = clearInterval }: {
  feed_url: string
  public_key: string
  // Why this copy of the app cannot replace itself (update-install.ts), or
  // null when it can.
  unavailable_reason?: string | null
  channel: UpdateChannel
  current_version: string
  create_backend: (input: { feed_url: string, public_key: string, channel: UpdateChannel }) => UpdateBackend
  now?: () => number
  set_interval?: (run: () => void, ms: number) => unknown
  clear_interval?: (timer: never) => void
}) => {
  // The channel is mutable (spec §8.2.5): the user can switch it at runtime,
  // which rebuilds the backend below rather than replacing the service. A
  // channel switch bumps `generation` so a check already in flight from the
  // old channel discards its result instead of applying it to the new one.
  let channel = initial_channel
  let generation = 0
  let state: UpdateStatus = !feed_url.startsWith('https://')
    ? { status: 'off', reason: 'The update feed is not an https URL.' }
    : unavailable_reason !== null
      ? { status: 'off', reason: unavailable_reason }
      : { status: 'idle', checked_at_ms: null }
  let backend: UpdateBackend | null = null
  let timer: unknown = null
  let running = false
  let installed = false

  const check = async (): Promise<void> => {
    if (backend === null || running || state.status === 'ready' || state.status === 'downloading') return
    running = true
    // The backend at the start of the check, and the generation it ran under:
    // a channel switch mid-check must not let the stale result reach the new
    // channel, and one in-flight check at a time holds `running`.
    const at = backend
    const at_generation = generation
    try {
      const found = await at.check()
      if (at_generation !== generation) return
      if (found === null || !newer(found.version, current_version)) {
        state = { status: 'idle', checked_at_ms: now() }
      } else if (major(found.version) > major(current_version)) {
        state = { status: 'major_available', version: found.version }
      } else {
        state = { status: 'downloading', version: found.version }
        await at.download()
        if (at_generation !== generation) return
        state = { status: 'ready', version: found.version }
      }
    } catch (error) {
      if (at_generation !== generation) return
      state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
    } finally {
      running = false
      // A channel switch bumped the generation while this check was in
      // flight: its result is discarded above, and the new channel still gets
      // its first check now that this one has unwound.
      if (at_generation !== generation && state.status === 'idle') check().catch(() => {})
    }
  }

  return {
    get_state: (): UpdateStatus => state,
    // The channel the service checks (spec §8.2.5), as the user last chose it.
    get_channel: (): UpdateChannel => channel,
    // Switches the channel at runtime: the backend is rebuilt for the new
    // channel and it checks again. A staged release from the old channel is
    // dropped, and nothing moves while the service never built a backend
    // (off, or start failed) -- the stored channel is used when it can.
    set_channel: (next: UpdateChannel): UpdateStatus => {
      if (next === channel) return state
      channel = next
      generation++
      if (backend === null) return state
      state = { status: 'idle', checked_at_ms: now() }
      try {
        backend = create_backend({ feed_url, public_key, channel })
      } catch (error) {
        state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
        return state
      }
      check().catch(() => {})
      return state
    },
    start: (): void => {
      if (state.status === 'off' || backend !== null) return
      try {
        backend = create_backend({ feed_url, public_key, channel })
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
      const at = backend
      const at_generation = generation
      const { version } = state
      state = { status: 'downloading', version }
      try {
        await at.download()
        if (at_generation !== generation) return
        state = { status: 'ready', version }
      } catch (error) {
        if (at_generation !== generation) return
        state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
      }
    },
    stop: (): void => {
      if (timer !== null) clear_interval(timer as never)
      timer = null
    },
    // At the user's quit: a staged release is handed to the swap helper once.
    install_on_quit: (): void => {
      if (backend === null || state.status !== 'ready' || installed) return
      installed = true
      try {
        backend.install()
      } catch (error) {
        state = { status: 'error', message: error instanceof Error ? error.message : String(error) }
      }
    }
  }
}
