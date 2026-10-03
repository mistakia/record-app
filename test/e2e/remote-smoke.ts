// Launches the built app (`bun run build` first) against a running node in
// remote mode and walks the first slice: save the node URL, test the
// connection, find a track in the list, and play it until the position
// advances. Read-only against the node. Runs under Node:
//
//   RECORD_NODE_URL=http://127.0.0.1:8088 RECORD_SMOKE_TITLE=Intro \
//     RECORD_SMOKE_ARTIST=SebastiAn node test/e2e/remote-smoke.ts

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron } from 'playwright-core'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const node_url = process.env.RECORD_NODE_URL ?? 'http://127.0.0.1:8088'
const title = process.env.RECORD_SMOKE_TITLE ?? 'Intro'
const artist = process.env.RECORD_SMOKE_ARTIST ?? 'SebastiAn'
const screenshot_path = process.env.RECORD_SMOKE_SCREENSHOT ?? join(tmpdir(), 'record-app-remote-smoke.png')
const MAX_PAGES = 100

const user_data_dir = await mkdtemp(join(tmpdir(), 'record-app-smoke-'))
const app = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${user_data_dir}`], timeout: 30_000 })
try {
  const window = await app.firstWindow()
  const console_errors: string[] = []
  window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })
  console.log('userData:', await app.evaluate(({ app: electron_app }) => electron_app.getPath('userData')))

  await window.locator('input[name=node_url]').fill(node_url)
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  const test_result = await window.getByTestId('connection-test-result').textContent()
  console.log('test connection:', test_result)
  if (test_result?.startsWith('Connected to peer') !== true) throw new Error('connection test failed')
  await window.getByRole('button', { name: 'Save', exact: true }).click()

  await window.getByTestId('track-total').filter({ hasNotText: /^0 tracks$/ }).waitFor()
  await window.locator('table[aria-busy=false]').waitFor()
  console.log('track list:', await window.getByTestId('track-total').textContent())
  console.log('libraries:', await window.getByLabel('Library').locator('option').allTextContents())

  const row = window.locator('tr', { has: window.getByRole('button', { name: title, exact: true }) }).filter({ hasText: artist })
  for (let page = 1; await row.count() === 0; page++) {
    if (page >= MAX_PAGES || await window.getByRole('button', { name: 'Next', exact: true }).isDisabled()) throw new Error(`no "${title}" by ${artist} in the list`)
    await window.getByRole('button', { name: 'Next', exact: true }).click()
    await window.getByText(`Page ${page + 1} of`).waitFor()
    await window.locator('table[aria-busy=false]').waitFor()
  }
  console.log('found row:', (await row.first().innerText()).replaceAll('\t', ' | '))
  await row.first().getByRole('button', { name: title, exact: true }).click()

  const player = window.getByTestId('player-bar')
  await window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 60_000 })
  const first_position = await window.getByTestId('player-position').textContent()
  await window.waitForTimeout(3000)
  const later_position = await window.getByTestId('player-position').textContent()
  console.log('player state:', await player.getAttribute('data-state'), '| position', first_position, '->', later_position)
  if (first_position === later_position) throw new Error('playback position did not advance')
  await window.screenshot({ path: screenshot_path })
  console.log('screenshot:', screenshot_path)
  if (console_errors.length > 0) throw new Error(`renderer console errors:\n${console_errors.join('\n')}`)
  console.log('remote smoke passed')
} finally {
  await app.close()
  await rm(user_data_dir, { recursive: true, force: true })
}
