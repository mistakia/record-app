// The built app (`bun run build` first) against an in-process record-node
// that requires a bearer token (spec §8.7.3): with no token the app shows
// the sign-in state and sends nothing more; a wrong token is refused and
// forgotten; the right one goes live; log out deletes it. The token must
// not appear in any file the app wrote, nor in anything the renderer can
// read. On macOS the token goes to the login Keychain under the test node's
// URL and is deleted again at the end. Runs under Node: node test/e2e/auth-smoke.ts

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { type Page } from 'playwright-core'

import { create_keychain_token_store } from '../../src/main/token-store.ts'
import { start_test_node } from '../integration/node-fixture.ts'
import { assert_quiet, launch_app } from './launch.ts'

const TOKEN = `smoke-${process.pid}-${Date.now()}.token`

const node = await start_test_node({ authenticate: (token) => token === TOKEN })
await node.peer.ingest_file(node.make_audio({ name: 'Auth Smoke.flac', seed: 3 }))
const user_data_dir = join(node.work_dir, 'profile')
// Start in remote mode, so the bundled node never runs.
await mkdir(user_data_dir, { recursive: true })
await writeFile(join(user_data_dir, 'connection.json'), JSON.stringify({ mode: 'remote', node_url: node.node_url }))

const step = (label: string, detail: unknown = ''): void => { console.log(`${label}:`, detail) }
const settings = async (window: Page) => { await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name: 'Settings', exact: true }).click() }
const status = (window: Page, value: string) => window.locator(`[data-testid=events-status][data-status=${value}]`)

const app = await launch_app({ user_data_dir })
try {
  const window = await app.firstWindow()
  await status(window, 'unauthorized').waitFor({ timeout: 30_000 })
  step('no token', await window.getByTestId('node-unauthorized').innerText())

  await window.getByTestId('node-unauthorized').getByRole('link', { name: 'Enter a token' }).click()
  await window.getByTestId('token-status').filter({ hasText: 'requires an access token' }).waitFor()
  await window.locator('input[name=token]').fill('wrong-token')
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  step('test with a wrong token', await window.getByTestId('connection-test-result').innerText())
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  // The save lands on the track list; back in settings, the refusal of a
  // saved token reads differently from the node needing one, so this
  // cannot pass on the state from before the save.
  await window.getByTestId('track-list').waitFor({ timeout: 30_000 })
  await settings(window)
  await window.getByTestId('token-status').filter({ hasText: 'refused its token' }).waitFor({ timeout: 30_000 })
  if (process.platform === 'darwin' && await create_keychain_token_store().get(node.node_url) !== null) throw new Error('the refused token is still in the Keychain')
  step('wrong token saved', 'refused and deleted')

  await settings(window)
  await window.locator('input[name=token]').fill(TOKEN)
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  const tested = await window.getByTestId('connection-test-result').innerText()
  step('test with the token', tested)
  if (!tested.startsWith('Connected to peer')) throw new Error('the token test failed')
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  await window.getByTestId('track-row').filter({ hasText: 'Auth Smoke' }).first().waitFor({ timeout: 30_000 })
  step('signed in', await window.getByTestId('track-total').textContent())

  const visible = await window.evaluate(async () => {
    const { record } = window as unknown as { record: { connection: { get: () => Promise<unknown> }, events: { get_state: () => Promise<unknown> } } }
    return JSON.stringify([await record.connection.get(), await record.events.get_state(), { ...localStorage }, document.documentElement.outerHTML])
  })
  if (visible.includes(TOKEN)) throw new Error('the renderer can read the token')
  const leaked: string[] = []
  for (const entry of await readdir(user_data_dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && (await readFile(join(entry.parentPath, entry.name))).includes(TOKEN)) leaked.push(join(entry.parentPath, entry.name))
  }
  if (leaked.length > 0) throw new Error(`the token is in ${leaked.join(', ')}`)
  step('token custody', 'not in the renderer, not in any file under userData')
  if (process.platform === 'darwin') {
    if (await create_keychain_token_store().get(node.node_url) !== TOKEN) throw new Error('the token is not in the Keychain')
    step('keychain', 'holds the token')
  }

  await settings(window)
  await window.getByTestId('token-status').getByRole('button', { name: 'Log out' }).click()
  await status(window, 'unauthorized').waitFor({ timeout: 30_000 })
  if (process.platform === 'darwin' && await create_keychain_token_store().get(node.node_url) !== null) throw new Error('log out left the token in the Keychain')
  step('log out', 'token deleted, sign-in needed')
  await assert_quiet(app)
  step('quiet', 'no system focus taken, every window muted')
  console.log('auth smoke passed')
} finally {
  await app.close().catch(() => {})
  if (process.platform === 'darwin') await create_keychain_token_store().delete(node.node_url).catch(() => {})
  await node.stop()
}
