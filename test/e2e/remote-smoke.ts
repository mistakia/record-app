// Launches the built app (`bun run build` first) against a running node in
// remote mode and walks the slices so far: save the node URL, test the
// connection, wait for the live event connection and the first reconcile,
// find a track in the list, and play it until the position advances. Then it
// quits, relaunches on the same profile to check the hibernation snapshot
// renders at once and turns fresh, and points the app at a closed port to
// check the unreachable banner. Read-only against the node. Runs under Node:
//
//   RECORD_NODE_URL=http://127.0.0.1:8088 RECORD_SMOKE_TITLE=Intro \
//     RECORD_SMOKE_ARTIST=SebastiAn node test/e2e/remote-smoke.ts
//
// RECORD_SMOKE_EXPECT_LIVE=1 also waits for the track count to change on its
// own, which needs the node to be ingesting while the smoke runs.
//
// RECORD_SMOKE_OFFLINE_CMD and RECORD_SMOKE_ONLINE_CMD, when both set, are
// shell commands that make the node unreachable and reachable again (for a
// tunnel: cancel and reopen the forward). The relaunch then runs offline, so
// the snapshot must render on its own, marked stale under the unreachable
// banner, and turn fresh once the node is back.

import { execSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron, type ElectronApplication, type Page } from 'playwright-core'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const node_url = process.env.RECORD_NODE_URL ?? 'http://127.0.0.1:8088'
const title = process.env.RECORD_SMOKE_TITLE ?? 'Intro'
const artist = process.env.RECORD_SMOKE_ARTIST ?? 'SebastiAn'
const expect_live = process.env.RECORD_SMOKE_EXPECT_LIVE === '1'
const screenshot_dir = process.env.RECORD_SMOKE_SCREENSHOT_DIR ?? tmpdir()
const UNREACHABLE_URL = 'http://127.0.0.1:9'
const offline_command = process.env.RECORD_SMOKE_OFFLINE_CMD
const online_command = process.env.RECORD_SMOKE_ONLINE_CMD
const run_offline = offline_command !== undefined && online_command !== undefined

const launch = async (user_data_dir: string): Promise<{ app: ElectronApplication, window: Page, console_errors: string[] }> => {
  const app = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${user_data_dir}`], timeout: 30_000 })
  const window = await app.firstWindow()
  const console_errors: string[] = []
  window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })
  return { app, window, console_errors }
}

const track_total = async (window: Page): Promise<number> => Number((await window.getByTestId('track-total').textContent())?.split(' ')[0])

const wait_fresh = async (window: Page): Promise<void> => {
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 60_000 })
}

const rows = (window: Page) => window.getByTestId('track-row')
const titles = async (window: Page) => await rows(window).locator('button').filter({ hasNotText: /^(Next|Queue)$/ }).allInnerTexts()
const settled = async (window: Page) => { await window.locator('[data-testid=track-list][aria-busy=false]').waitFor() }

const save_node_url = async (window: Page, url: string): Promise<void> => {
  await window.getByRole('link', { name: 'Connection', exact: true }).click()
  await window.locator('input[name=node_url]').fill(url)
  await window.getByRole('button', { name: 'Save', exact: true }).click()
}

const user_data_dir = await mkdtemp(join(tmpdir(), 'record-app-smoke-'))
try {
  // First launch: a fresh profile starts in bundled mode, so switch to the
  // remote node (confirmed, spec 8.3.4), go live, and play.
  const first = await launch(user_data_dir)
  const { window } = first
  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  await window.getByLabel('Remote node').check()
  await window.locator('input[name=node_url]').fill(node_url)
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  const test_result = await window.getByTestId('connection-test-result').textContent()
  console.log('test connection:', test_result)
  if (test_result?.startsWith('Connected to peer') !== true) throw new Error('connection test failed')
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  await window.getByRole('dialog').getByRole('button', { name: 'Switch' }).click()
  await wait_fresh(window)
  console.log('event connection: open, data fresh')
  await settled(window)
  console.log('track list:', await window.getByTestId('track-total').textContent())

  if (expect_live) {
    const before = await track_total(window)
    for (let waited = 0; await track_total(window) <= before; waited += 500) {
      if (waited > 120_000) throw new Error('the track total did not change on its own within 2 minutes')
      await window.waitForTimeout(500)
    }
    console.log('live update: track total', before, '->', await track_total(window), 'with no reload')
  }

  // Read-only browsing. The virtual list renders a window of rows however
  // long the result is; scrolling to the end fills in the last page.
  const total = await track_total(window)
  const scroller = window.getByTestId('track-scroller')
  const rendered_rows = await rows(window).count()
  const started = Date.now()
  await scroller.evaluate((element) => { element.scrollTop = element.scrollHeight })
  await rows(window).last().waitFor()
  await window.waitForFunction(() => document.querySelectorAll('[data-testid=track-list] [role=row][aria-busy=true]').length === 0, undefined, { timeout: 30_000 })
  console.log('virtual list:', { total, rows_in_dom_at_top: rendered_rows, rows_in_dom_at_end: await rows(window).count(), last_rows: (await titles(window)).slice(-3), filled_in_ms: Date.now() - started })
  if (rendered_rows > 120) throw new Error('the list rendered more rows than a window')
  await scroller.evaluate((element) => { element.scrollTop = 0 })

  await window.getByLabel('Sort by').selectOption('title')
  await window.getByRole('button', { name: 'Descending' }).click()
  await settled(window)
  console.log('sorted by title ascending, first rows:', (await titles(window)).slice(0, 3))
  await window.getByRole('button', { name: 'Ascending' }).click()
  await settled(window)
  console.log('sorted by title descending, first rows:', (await titles(window)).slice(0, 3))
  // Back to the default view: newest first.
  await window.getByLabel('Sort by').selectOption('added_at')
  await settled(window)

  const tag_buttons = window.getByTestId('tag-filter').getByRole('button')
  if (await tag_buttons.count() > 0) {
    const tag = (await tag_buttons.first().innerText()).replace(/\s+\d+$/, '')
    await tag_buttons.first().click()
    await settled(window)
    console.log(`tag filter "${tag}":`, await window.getByTestId('track-total').textContent())
    await window.getByRole('button', { name: 'Clear filters' }).click()
    await settled(window)
  } else {
    console.log('tag filter: the node has no tags yet')
  }

  await window.getByLabel('Search tracks').fill(artist)
  await window.locator('[data-testid=track-row]', { hasText: artist }).first().waitFor({ timeout: 30_000 })
  await settled(window)
  console.log(`search "${artist}":`, await window.getByTestId('track-total').textContent())
  const row = rows(window).filter({ has: window.getByRole('button', { name: title, exact: true }) }).filter({ hasText: artist })
  console.log('found row:', (await row.first().innerText()).replaceAll('\n', ' | '))
  await row.first().getByRole('button', { name: title, exact: true }).click()
  await window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 60_000 })
  const first_position = await window.getByTestId('player-position').textContent()
  await window.waitForTimeout(3000)
  const later_position = await window.getByTestId('player-position').textContent()
  console.log('playback:', first_position, '->', later_position)
  if (first_position === later_position) throw new Error('playback position did not advance')
  await window.screenshot({ path: join(screenshot_dir, 'record-app-smoke-playing.png') })

  // Let the renderer hand main a snapshot (every 5 s), then quit cleanly,
  // which writes it.
  await window.getByRole('button', { name: 'Pause', exact: true }).click()
  await window.waitForTimeout(6000)
  if (first.console_errors.length > 0) throw new Error(`renderer console errors:\n${first.console_errors.join('\n')}`)
  await first.app.close()
  const snapshot = JSON.parse(await readFile(join(user_data_dir, 'snapshot.json'), 'utf8')) as {
    libraries: unknown[]
    active: { total: number, tracks: Array<{ title: string | null }> } | null
    queue: { position_seconds: number } | null
    route: string
  }
  console.log('snapshot on disk:', { libraries: snapshot.libraries.length, active_tracks: snapshot.active?.tracks.length, queue_position: snapshot.queue?.position_seconds, route: snapshot.route })
  if (snapshot.active === null || snapshot.active.tracks.length === 0 || snapshot.queue === null) throw new Error('the snapshot has no track page or queue')

  // Second launch. Offline, the snapshot alone must render, marked stale.
  if (run_offline) execSync(offline_command, { stdio: 'inherit' })
  const second = await launch(user_data_dir)
  await rows(second.window).first().waitFor()
  const player_text = (await second.window.getByTestId('player-bar').innerText()).replaceAll('\n', ' ')
  console.log('relaunch: rows rendered, player cued:', player_text)
  if (run_offline) {
    await second.window.getByTestId('node-unreachable').waitFor({ timeout: 30_000 })
    const shown_total = await track_total(second.window)
    const first_title = (await titles(second.window))[0]
    const freshness = await second.window.getByTestId('events-status').getAttribute('data-freshness')
    console.log('offline relaunch:', { shown_total, first_title, freshness, snapshot_total: snapshot.active.total, snapshot_first_title: snapshot.active.tracks[0]?.title })
    if (shown_total !== snapshot.active.total || first_title !== (snapshot.active.tracks[0]?.title ?? 'Untitled') || freshness !== 'stale') throw new Error('the offline relaunch did not render the stale snapshot')
    await second.window.screenshot({ path: join(screenshot_dir, 'record-app-smoke-offline-snapshot.png') })
    execSync(online_command, { stdio: 'inherit' })
    await second.window.getByRole('button', { name: 'Retry now', exact: true }).click()
  }
  await wait_fresh(second.window)
  console.log('relaunch: reconciled to fresh')

  // The cued track plays from where it was paused.
  await second.window.getByRole('button', { name: 'Play', exact: true }).click()
  await second.window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 60_000 })
  console.log('restored playback:', await second.window.getByTestId('player-position').textContent())

  // A node that cannot be reached shows the banner and keeps retrying.
  await save_node_url(second.window, UNREACHABLE_URL)
  await second.window.getByTestId('node-unreachable').waitFor({ timeout: 30_000 })
  console.log('unreachable banner:', (await second.window.getByTestId('node-unreachable').innerText()).replaceAll('\n', ' '))
  await second.window.screenshot({ path: join(screenshot_dir, 'record-app-smoke-unreachable.png') })
  if (second.console_errors.length > 0) throw new Error(`renderer console errors:\n${second.console_errors.join('\n')}`)
  await second.app.close()
  console.log('screenshots:', screenshot_dir)
  console.log('remote smoke passed')
} finally {
  await rm(user_data_dir, { recursive: true, force: true })
}
