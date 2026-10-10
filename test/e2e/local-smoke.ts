// The built app (`bun run build` first) against an in-process record-node
// it owns, so every write stays off any shared node. It walks browsing
// (search, sort, the tag filter), tagging, ingest (main's file picker, a
// drop, a URL, add by CID), libraries (link, disconnect, connect, unlink,
// the own about), identity (public key, export, and no trace of the key in
// any file the app wrote), listens, peers, the list and player hotkeys
// (t, q, Shift+Q, Space), and gapless playback with its listen and Media
// Session, and that the app:// scheme serves only the renderer. Needs ffmpeg and fpcalc; set
// RECORD_TOOLCHAIN_PREFLIGHT=bypass when their versions differ from
// record-node's pins. Runs under Node: node test/e2e/local-smoke.ts

import { readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron, type Page } from 'playwright-core'
import { create_peer, start_peer, stop_peer } from 'record-node'

import { start_test_node } from '../integration/node-fixture.ts'
import { check_quit_stops_child, run_bundled_checks } from './bundled-run.ts'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const screenshot_dir = process.env.RECORD_SMOKE_SCREENSHOT_DIR ?? tmpdir()

const node = await start_test_node()
const other = await create_peer({ config: { network: false, allow_toolchain_mismatch: true } })
await start_peer(other)
await node.peer.ingest_file(node.make_audio({ name: 'Smoke Alpha.flac', seed: 1, seconds: 8 }))
await node.peer.ingest_file(node.make_audio({ name: 'Smoke Beta.flac', seed: 2, seconds: 8 }))
const user_data_dir = join(node.work_dir, 'profile')
const app = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${user_data_dir}`], timeout: 30_000 })

const step = (label: string, detail: unknown = ''): void => { console.log(`${label}:`, detail) }
const toast = async (window: Page, text: string | RegExp) => { await window.getByTestId('toast').filter({ hasText: text }).first().waitFor({ timeout: 30_000 }) }
// The sidebar's first 'Tracks' is every library; a second, under My
// library, is the own one.
const nav = async (window: Page, name: string) => { await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name, exact: true }).first().click() }
const rows = (window: Page) => window.getByTestId('track-row')
// The title is the first child of a row's third cell (index, adopt, title).
const titles = async (window: Page) => await rows(window).evaluateAll((elements) => elements.map((row) => row.querySelectorAll('[role=cell]')[2]?.firstElementChild?.textContent ?? ''))
// A click on the title cell moves the keyboard cursor there and focuses the list.
const focus_row = async (window: Page, title: string) => { await rows(window).filter({ hasText: title }).getByRole('cell').nth(2).click() }
const unfold = async (window: Page, title: string) => {
  const toggle = window.getByRole('button', { name: title })
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
}
const settled = async (window: Page) => { await window.locator('[data-testid=track-list][aria-busy=false]').waitFor() }

const files_containing = async (directory: string, needle: string): Promise<string[]> => {
  const found: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue
    const path = join(entry.parentPath, entry.name)
    if ((await readFile(path)).includes(needle)) found.push(path)
  }
  return found
}

let private_key = ''
try {
  const window = await app.firstWindow()
  // The renderer comes from app://record/, which serves only its own files. The
  // probes' 404s are expected, so they run before console errors are collected.
  const served = await window.evaluate(async () => ({
    origin: location.origin,
    outside: (await fetch('app://record/..%2fmain%2findex.js')).status,
    missing: (await fetch('app://record/no-such-file.js')).status,
    malformed: (await fetch('app://record/%E0%A4%A.js')).status,
    other_host: (await fetch('app://other/index.html').catch(() => null))?.status ?? 'refused'
  }))
  step('app scheme', served)
  if (served.origin !== 'app://record' || served.outside !== 404 || served.missing !== 404 || served.malformed !== 404 || served.other_host === 200) throw new Error('the app scheme served outside the renderer')
  const console_errors: string[] = []
  window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })
  // A fresh profile starts in bundled mode; check it, then switch to the
  // in-process node, which holds the tracks the rest of the walk uses. The
  // smoke's dialog stubs below replace the ones the bundled checks set.
  await run_bundled_checks({ app, window, step, remote_url: node.node_url, user_data_dir, audio_path: node.make_audio({ name: 'Smoke Bundled.flac', seed: 9 }) })
  await nav(window, 'Tracks')
  await settled(window)

  // Browsing.
  await window.getByLabel('Search tracks').fill('Alpha')
  await window.getByTestId('track-total').filter({ hasText: /^1 tracks$/ }).waitFor()
  step('search "Alpha"', await titles(window))
  // The results are a new view, but typing stays in the search: t is text
  // there, not the list's tag key.
  if (!await window.getByLabel('Search tracks').evaluate((input) => input === document.activeElement)) throw new Error('the search lost focus when its results loaded')
  await window.keyboard.press('t')
  if (await window.getByLabel('Search tracks').inputValue() !== 'Alphat' || await window.getByRole('dialog').count() > 0) throw new Error('a key typed after the results loaded left the search')
  await window.getByRole('button', { name: 'Clear filters' }).click()
  await window.getByTestId('track-total').filter({ hasText: /^2 tracks$/ }).waitFor()
  // A header click sorts ascending; a second reverses it.
  const list = window.getByTestId('track-list')
  const title_header = list.getByRole('columnheader').filter({ has: window.getByRole('button', { name: 'Title' }) })
  await list.getByRole('button', { name: 'Title' }).click()
  await title_header.and(window.locator('[aria-sort=ascending]')).waitFor()
  await settled(window)
  const ascending = await titles(window)
  step('sort by title ascending', ascending)
  if (ascending[0] !== 'Smoke Alpha') throw new Error('sort did not apply')
  await list.getByRole('button', { name: 'Title' }).click()
  await title_header.and(window.locator('[aria-sort=descending]')).waitFor()
  await settled(window)
  const descending = await titles(window)
  step('sort by title descending', descending)
  if (descending[0] !== 'Smoke Beta') throw new Error('the second header click did not reverse the sort')
  await list.getByRole('button', { name: 'Title' }).click()
  await title_header.and(window.locator('[aria-sort=ascending]')).waitFor()
  await settled(window)

  // Tagging with t at the cursor row, then the tag filter.
  await focus_row(window, 'Smoke Alpha')
  await window.keyboard.press('t')
  const editor = window.getByTestId('tag-editor')
  await editor.getByLabel('New tag').fill('smoke-tag')
  await editor.getByLabel('New tag').press('Enter')
  await editor.getByRole('listitem').filter({ hasText: 'smoke-tag' }).waitFor()
  await editor.getByLabel('New tag').press('Escape')
  await editor.waitFor({ state: 'detached' })
  await window.getByTestId('tag-filter').getByRole('button', { name: /smoke-tag/ }).click()
  await window.getByTestId('track-total').filter({ hasText: /^1 tracks$/ }).waitFor()
  step('tag filter "smoke-tag"', await titles(window))
  await window.getByRole('button', { name: 'Clear filters' }).click()

  // Gapless playback with a listen and Media Session: Alpha alone from the
  // menu, Beta queued with q, seen in the queue overlay; a hotkey pauses it.
  await settled(window)
  await rows(window).filter({ hasText: 'Smoke Alpha' }).click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Play', exact: true }).click()
  await focus_row(window, 'Smoke Beta')
  await window.keyboard.press('q')
  await window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 30_000 })
  await window.keyboard.press('Shift+Q')
  const queued = await window.getByTestId('queue-panel').getByTestId('queue-entry').allInnerTexts()
  step('queue', queued.map((text) => text.replaceAll('\n', ' | ')))
  if (!queued.some((text) => text.includes('Smoke Beta'))) throw new Error('q did not queue Smoke Beta')
  await window.keyboard.press('Shift+Q')
  await window.getByTestId('queue-panel').waitFor({ state: 'detached' })
  await window.evaluate(() => {
    const bar = document.querySelector('[data-testid=player-bar]')
    const states: string[] = []
    Object.assign(window, { player_states: states })
    new MutationObserver(() => { states.push(bar?.getAttribute('data-state') ?? '') }).observe(bar as Element, { attributes: true, attributeFilter: ['data-state'] })
  })
  step('media session', await window.evaluate(() => ({ title: navigator.mediaSession.metadata?.title, state: navigator.mediaSession.playbackState })))
  await window.getByTestId('player-bar').filter({ hasText: 'Smoke Beta' }).waitFor({ timeout: 20_000 })
  const states = await window.evaluate(() => (window as unknown as { player_states: string[] }).player_states)
  step('player states across the transition', states.length === 0 ? 'playing throughout' : states.join(' -> '))
  if (states.some((state) => state !== 'playing')) throw new Error('the transition was not gapless')
  await focus_row(window, 'Smoke Beta')
  await window.keyboard.press('Space')
  await window.locator('[data-testid=player-bar][data-state=paused]').waitFor()
  step('Space hotkey', 'paused')

  // Ingest: main's picker (stubbed in main, as a user's choice), a drop, a URL, and a CID.
  await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name: 'Add music' }).click()
  const chosen = node.make_audio({ name: 'Smoke Gamma.flac', seed: 3 })
  await app.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }) }, chosen)
  await window.getByRole('button', { name: 'Choose files or folders' }).click()
  const dropped = (await readFile(node.make_audio({ name: 'Smoke Delta.flac', seed: 4 }))).toString('base64')
  await window.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], 'Smoke Delta.flac', { type: 'audio/flac' }))
    document.querySelector('[data-testid=drop-zone]')?.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  }, dropped)
  // Each wait names its own item: the bundled pass left one in the list.
  const finished = (label: string) => window.locator('[data-testid=import-item][data-finished=true]').filter({ hasText: label }).first().waitFor({ timeout: 60_000 })
  await finished('Chosen files')
  await finished('Smoke Delta.flac')
  await window.getByLabel('Import from URL').fill('https://example.test/smoke-epsilon')
  await window.getByRole('button', { name: 'Import URL' }).click()
  await finished('smoke-epsilon')
  step('imports', (await window.getByTestId('import-item').allInnerTexts()).map((text) => text.replaceAll('\n', ' | ')))
  const [alpha] = (await node.peer.list_tracks({ offset: 0, limit: 10, shuffle: false, sort: 'title', order: 'asc', query: 'Alpha' })).items
  await unfold(window, 'Add by CID')
  await window.getByLabel('Add by content CID').fill(alpha?.content_cid ?? '')
  await window.getByRole('button', { name: 'Add track' }).click()
  await toast(window, /Added to /)
  const total = (await node.peer.list_tracks({ offset: 0, limit: 1, shuffle: false, sort: 'added_at', order: 'desc' })).total
  step('tracks on the node after ingest', total)
  if (total !== 5) throw new Error('ingest did not add three tracks')

  // Libraries: link through its step flow, disconnect, connect, unlink, and
  // the own about.
  await nav(window, 'Libraries')
  await window.getByRole('link', { name: 'Link a library' }).first().click()
  await window.getByLabel('Library address').fill(other.identity().own_address)
  await window.getByRole('button', { name: 'Continue' }).click()
  await window.getByLabel('Alias').fill('Smoke Other')
  await window.getByRole('button', { name: 'Link library' }).click()
  await window.getByTestId('library-profile').filter({ hasText: 'Smoke Other' }).waitFor()
  await nav(window, 'Libraries')
  const linked = window.getByTestId('library-row').filter({ hasText: 'Smoke Other' })
  await linked.getByTestId('replication').filter({ hasText: 'Replicating' }).waitFor()
  step('linked library', (await linked.innerText()).replaceAll('\n', ' | ').replaceAll('\t', ' | '))
  await linked.getByRole('button', { name: 'Pause', exact: true }).click()
  await toast(window, 'Replication paused.')
  await linked.getByRole('button', { name: 'Resume', exact: true }).click()
  await toast(window, 'Replication resumed.')
  await linked.getByRole('button', { name: 'Unlink', exact: true }).click()
  await window.getByRole('dialog').getByRole('button', { name: 'Unlink' }).click()
  await linked.waitFor({ state: 'detached' })

  // Identity: the profile it goes by, then the key.
  await nav(window, 'Identity')
  await window.getByTestId('identity-profile').locator('input[name=name]').fill('Smoke Own')
  await window.getByRole('button', { name: 'Save profile' }).click()
  await toast(window, 'Profile saved.')
  step('own about on the node', await node.peer.get_about(node.peer.identity().own_address))
  step('key holder', await window.getByTestId('key-holder').innerText())
  await window.getByRole('button', { name: 'Show public key' }).click()
  step('public key', await window.getByTestId('public-key').locator('code').textContent())
  private_key = (await node.peer.export_identity()).private_key
  // The generic request channel must refuse the export outright.
  const generic = await window.evaluate(async () => await (window as unknown as { record: { request: (request: unknown) => Promise<{ ok: boolean, failure?: { kind: string } }> } }).record.request({ method: 'get', path_template: '/identity/export' }))
  step('export through the generic request channel', generic)
  if (generic.ok || generic.failure?.kind !== 'refused') throw new Error('the generic channel served the private key')
  // Main's native confirmation, answered first with Cancel, then with Show.
  const answer_export_dialog = async (response: number) => {
    await app.evaluate(({ dialog }, choice) => {
      if (!('export_dialogs' in globalThis)) Object.assign(globalThis, { export_dialogs: 0 })
      dialog.showMessageBox = async () => {
        Object.assign(globalThis, { export_dialogs: (globalThis as unknown as { export_dialogs: number }).export_dialogs + 1 })
        return { response: choice, checkboxChecked: false }
      }
    }, response)
  }
  await window.getByRole('button', { name: 'Export identity' }).click()
  await answer_export_dialog(0)
  await window.getByRole('button', { name: 'Show private key' }).click()
  await window.waitForTimeout(500)
  if (await window.getByTestId('exported-key').count() !== 0) throw new Error('the key was shown after Cancel')
  await answer_export_dialog(1)
  await window.getByRole('button', { name: 'Show private key' }).click()
  await window.getByTestId('exported-key').waitFor()
  step('native confirmations shown', await app.evaluate(() => (globalThis as unknown as { export_dialogs: number }).export_dialogs))
  if (await window.getByTestId('exported-key').inputValue() !== private_key) throw new Error('the export did not show the node key')
  await window.getByRole('button', { name: 'Done' }).click()
  await window.getByTestId('exported-key').waitFor({ state: 'detached' })
  step('export', `shown once and closed; last export: ${await window.getByTestId('last-export').innerText()}`)
  await unfold(window, 'Import')
  step('import in remote mode', await window.getByTestId('import-unavailable').innerText())

  // Listens and peers.
  await nav(window, 'Recently played')
  const listened = window.getByTestId('listens').getByTestId('track-row')
  await listened.first().waitFor()
  step('listens', (await listened.allInnerTexts()).map((text) => text.replaceAll('\n', ' | ')))
  await nav(window, 'Settings')
  await unfold(window, 'Peers')
  step('peers', (await window.locator('#settings-peers').innerText()).replaceAll('\n', ' | '))
  await window.screenshot({ path: join(screenshot_dir, 'record-app-local-smoke.png') })
  if (console_errors.length > 0) throw new Error(`renderer console errors:\n${console_errors.join('\n')}`)
} finally {
  await app.close()
}
try {
  // After a clean quit (snapshot written), no file in the profile holds the key.
  const leaks = await files_containing(user_data_dir, private_key)
  step('files in the app profile containing the exported key', leaks)
  if (private_key === '' || leaks.length > 0) throw new Error('the exported key reached a file')
  await check_quit_stops_child({
    launch: async () => {
      const fresh = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${join(node.work_dir, 'profile-quit')}`], timeout: 30_000 })
      return { app: fresh, window: await fresh.firstWindow() }
    },
    step
  })
  console.log('local smoke passed')
} finally {
  await stop_peer(other)
  await node.stop()
}
