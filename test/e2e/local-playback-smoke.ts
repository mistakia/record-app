// Playback in the built app (`bun run build` first) against an in-process
// record-node it owns, so the listen write never touches a shared node.
// Two short generated tracks are ingested; the app plays the first, the
// second takes over gaplessly (the player never leaves `playing`), the
// first one's listen reaches the node, and Media Session carries the
// metadata. Needs ffmpeg and fpcalc; set RECORD_TOOLCHAIN_PREFLIGHT=bypass
// when their versions differ from record-node's pins. Runs under Node:
//
//   node test/e2e/local-playback-smoke.ts

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from 'playwright-core'
import { as_api_resolver, create_api_server, create_peer, start_peer, stop_api_server, stop_peer } from 'record-node'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const TRACK_SECONDS = 8
const screenshot_dir = process.env.RECORD_SMOKE_SCREENSHOT_DIR ?? tmpdir()

const work_dir = await mkdtemp(join(tmpdir(), 'record-app-local-smoke-'))
// Distinct noise per track, so their fingerprints (and track ids) differ.
const make_track = (name: string, seed: number): string => {
  const path = join(work_dir, `${name}.flac`)
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `anoisesrc=d=${TRACK_SECONDS}:c=pink:seed=${seed}:a=0.3`, '-metadata', `title=${name}`, '-metadata', 'artist=Smoke', path])
  return path
}

const peer = await create_peer({ config: { network: false, allow_toolchain_mismatch: process.env.RECORD_TOOLCHAIN_PREFLIGHT === 'bypass' } })
await start_peer(peer)
const server = await create_api_server({ peer, resolve: as_api_resolver(peer.context.resolve), port: 0, cors_origins: [], log: false })
const node_url = `http://127.0.0.1:${server.port}`
const user_data_dir = join(work_dir, 'profile')
const app = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${user_data_dir}`], timeout: 30_000 })
try {
  await peer.ingest_file(make_track('Smoke Alpha', 1))
  await peer.ingest_file(make_track('Smoke Beta', 2))
  const window = await app.firstWindow()
  const console_errors: string[] = []
  window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })

  await window.locator('input[name=node_url]').fill(node_url)
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  await window.locator('[data-testid=events-status][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  await window.locator('table[aria-busy=false]').waitFor()

  // Newest first: Beta is listed first, so play Alpha (the second row)
  // with Beta added after it.
  await window.getByRole('button', { name: 'Smoke Alpha', exact: true }).click()
  await window.locator('tr', { hasText: 'Smoke Beta' }).getByRole('button', { name: 'Add to queue' }).click()
  await window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 30_000 })

  // Record every state the player bar passes through from here on.
  await window.evaluate(() => {
    const bar = document.querySelector('[data-testid=player-bar]')
    const states: string[] = [bar?.getAttribute('data-state') ?? '']
    Object.assign(window, { player_states: states })
    new MutationObserver(() => { states.push(bar?.getAttribute('data-state') ?? '') }).observe(bar as Element, { attributes: true, attributeFilter: ['data-state'] })
  })
  const session = await window.evaluate(() => ({ title: navigator.mediaSession.metadata?.title, artist: navigator.mediaSession.metadata?.artist, state: navigator.mediaSession.playbackState }))
  console.log('media session while Alpha plays:', session)
  if (session.title !== 'Smoke Alpha' || session.state !== 'playing') throw new Error('Media Session does not show the playing track')

  await window.locator('[data-testid=player-bar]', { hasText: 'Smoke Beta' }).waitFor({ timeout: (TRACK_SECONDS + 10) * 1000 })
  const states = await window.evaluate(() => (window as unknown as { player_states: string[] }).player_states)
  console.log('player states across the transition:', states.join(' -> '))
  if (states.some((state) => state !== 'playing')) throw new Error('the transition left the playing state, so it was not gapless')
  const beta_session = await window.evaluate(() => navigator.mediaSession.metadata?.title)
  console.log('media session after the transition:', beta_session)
  // The queue panel shows the play order with the current entry marked.
  await window.getByRole('button', { name: /^Queue \(/ }).click()
  const queue = await window.getByTestId('queue-entry').allInnerTexts()
  const current = await window.locator('[data-testid=queue-entry][aria-current=true]').innerText()
  console.log('queue:', queue.map((text) => text.split('\n')[0]), '| current:', current.split('\n')[0])
  if (!current.startsWith('Smoke Beta')) throw new Error('the queue panel does not mark the playing entry')
  await window.screenshot({ path: join(screenshot_dir, 'record-app-local-playback.png') })

  const { items } = await peer.list_tracks({ offset: 0, limit: 10, shuffle: false, sort: 'added_at', order: 'desc' })
  const counts = Object.fromEntries(items.map(({ title, listen_count }) => [title, listen_count]))
  console.log('listen counts on the node:', counts)
  if (counts['Smoke Alpha'] !== 1) throw new Error('the listen for Smoke Alpha did not reach the node')
  if (console_errors.length > 0) throw new Error(`renderer console errors:\n${console_errors.join('\n')}`)
  console.log('local playback smoke passed')
} finally {
  await app.close()
  await stop_api_server(server)
  await stop_peer(peer)
  await rm(work_dir, { recursive: true, force: true })
}
