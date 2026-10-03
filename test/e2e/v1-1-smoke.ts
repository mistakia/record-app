// The built app (`bun run build` first) against an in-process record-node,
// walking the record-docs v1.1 surfaces: own-library management (create,
// the listens library, retire, profile choice). Writes stay on the
// in-process node. Needs ffmpeg and fpcalc; set
// RECORD_TOOLCHAIN_PREFLIGHT=bypass when their versions differ from
// record-node's pins. Runs under Node: node test/e2e/v1-1-smoke.ts

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron, type Page } from 'playwright-core'

import { start_test_node } from '../integration/node-fixture.ts'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))

const node = await start_test_node()
await node.peer.ingest_file(node.make_audio({ name: 'V11 Alpha.flac', seed: 11 }))
const user_data_dir = join(node.work_dir, 'profile')
// Start in remote mode against the in-process node, so no bundled node runs.
await mkdir(user_data_dir, { recursive: true })
await writeFile(join(user_data_dir, 'connection.json'), JSON.stringify({ mode: 'remote', node_url: node.node_url }))

const step = (label: string, detail: unknown = ''): void => { console.log(`${label}:`, detail) }
const nav = async (window: Page, name: string) => { await window.getByRole('navigation').getByRole('link', { name, exact: true }).click() }
const toast = async (window: Page, text: string | RegExp) => { await window.getByTestId('toast').filter({ hasText: text }).first().waitFor({ timeout: 30_000 }) }

const app = await electron.launch({ args: [APP_ROOT, `--user-data-dir=${user_data_dir}`], timeout: 30_000 })
try {
  const window = await app.firstWindow()
  const console_errors: string[] = []
  window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 60_000 })

  // Own-library management.
  await nav(window, 'Libraries')
  const own_rows = window.getByTestId('own-library-row')
  await own_rows.first().waitFor()
  step('own libraries at start', await own_rows.allInnerTexts())
  const listens = own_rows.and(window.locator('[data-type=listens]'))
  if (await listens.count() !== 1) throw new Error('expected one listens library')
  if (await listens.getByRole('button', { name: 'Retire' }).count() !== 0) throw new Error('the listens library offers Retire')
  await window.getByLabel('New library name').fill('Smoke Mixes')
  await window.getByLabel('Discriminator').fill('smoke-mixes')
  await window.getByRole('button', { name: 'Create', exact: true }).click()
  await toast(window, 'Library created.')
  const created = own_rows.filter({ hasText: 'Smoke Mixes' })
  await created.waitFor()
  step('created', (await created.innerText()).replaceAll('\n', ' | '))
  await created.getByRole('button', { name: 'Profile' }).click()
  await window.getByTestId('about-editor').locator('input[name=name]').and(window.locator('[value="Smoke Mixes"]')).waitFor()
  step('profile', 'switched to the new library')
  await created.getByRole('button', { name: 'Retire' }).click()
  await window.getByRole('dialog').getByRole('button', { name: 'Retire permanently' }).click()
  await toast(window, /^Retired /)
  await own_rows.filter({ hasText: 'Smoke Mixes' }).and(window.locator('[data-retired=true]')).waitFor()
  if (await own_rows.filter({ hasText: 'Smoke Mixes' }).getByRole('button').count() !== 0) throw new Error('a retired library still offers actions')
  step('retired', 'marked retired, no actions')
  await nav(window, 'Identity')
  await window.getByTestId('identity-own-library').filter({ hasText: '(retired)' }).waitFor()
  step('identity own libraries', await window.getByTestId('identity-own-library').allInnerTexts())

  if (console_errors.length > 0) throw new Error(`renderer console errors: ${console_errors.join(' | ')}`)
  console.log('v1.1 smoke passed')
} finally {
  await app.close().catch(() => {})
  await node.stop()
}
