// The built app (`bun run build` first) against an in-process record-node,
// walking the record-docs v1.1 surfaces: own-library management (create,
// the listens library, retire, profile choice) and write targets (the
// importer's selector, adoption into a chosen library, tagging into it),
// capability management (issue with a filter, revoke, the held list),
// pinning from the track menu, holders in the aggregated view, removal
// from an own library, and the replication-policy editor on a
// linked library. Writes stay on the
// in-process node. Needs ffmpeg and fpcalc; set
// RECORD_TOOLCHAIN_PREFLIGHT=bypass when their versions differ from
// record-node's pins. Runs under Node: node test/e2e/v1-1-smoke.ts

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { _electron as electron, type Page } from 'playwright-core'

import { create_peer, start_peer, stop_peer } from 'record-node'

import { start_test_node } from '../integration/node-fixture.ts'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))

const node = await start_test_node()
await node.peer.ingest_file(node.make_audio({ name: 'V11 Alpha.flac', seed: 11 }))
const other = await create_peer({ config: { network: false, allow_toolchain_mismatch: true } })
await start_peer(other)
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

  // Write targets: two own libraries now, so writes offer a selector.
  await nav(window, 'Import')
  const import_target = window.getByTestId('write-target')
  await import_target.waitFor()
  const import_options = await import_target.locator('option').allInnerTexts()
  step('import targets', import_options)
  if (import_options.length !== 2 || !import_options.includes('Smoke Mixes')) throw new Error('the importer does not offer both own libraries')
  await nav(window, 'Tracks')
  const row = window.getByTestId('track-row').filter({ hasText: 'V11 Alpha' })
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Adopt to library' }).click()
  const adopt = window.getByTestId('adopt-dialog')
  // The default library already holds the track, so Smoke Mixes is the one target.
  await adopt.getByTestId('write-target').filter({ hasText: /Smoke Mixes$/ }).waitFor()
  await adopt.getByRole('button', { name: 'Adopt', exact: true }).click()
  await toast(window, 'Adopted into Smoke Mixes.')
  await window.getByLabel('Library', { exact: true }).selectOption({ label: 'Smoke Mixes (own, 1 tracks)' })
  await window.getByTestId('track-total').filter({ hasText: /^1 tracks$/ }).waitFor()
  step('adopted', 'V11 Alpha is in Smoke Mixes')
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Tags' }).click()
  const editor = window.getByTestId('tag-editor')
  // Viewing Smoke Mixes, the tag goes there by default.
  if (await editor.getByLabel('Target library').inputValue() !== (await window.getByLabel('Library', { exact: true }).inputValue())) throw new Error('the tag target is not the viewed library')
  await editor.getByLabel('New tag').fill('v11-tag')
  await editor.getByRole('button', { name: 'Add', exact: true }).click()
  await editor.getByRole('button', { name: 'Remove tag v11-tag' }).waitFor()
  step('tagged', (await editor.locator('li').allInnerTexts()).join(' | '))
  await editor.getByRole('button', { name: 'Done' }).click()
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Pin', exact: true }).click()
  await toast(window, 'Pinned: kept on all your devices.')
  await row.getByTestId('pinned').waitFor()
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Unpin' }).click()
  await toast(window, 'Unpinned.')
  await row.getByTestId('pinned').waitFor({ state: 'detached' })
  step('pin', 'pinned, then unpinned, from the track menu')
  // The aggregated view says which libraries hold a track; remove it from
  // one own library and the other keeps it.
  await window.getByLabel('Library', { exact: true }).selectOption({ label: 'All libraries' })
  await row.getByTestId('track-holders').filter({ hasText: /^in 2 own$/ }).waitFor()
  step('holders', await row.getByTestId('track-holders').innerText())
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Remove from library' }).click()
  const remove = window.getByTestId('remove-dialog')
  await remove.getByLabel('Library to remove from').selectOption({ label: 'Smoke Mixes' })
  await remove.getByRole('button', { name: 'Remove', exact: true }).click()
  await toast(window, 'Removed from Smoke Mixes.')
  await row.getByTestId('track-holders').filter({ hasText: /^in 1 own$/ }).waitFor()
  step('removed', 'V11 Alpha left Smoke Mixes and stays in the default library')
  await nav(window, 'Libraries')

  // Capability management on the new library: issue with a filter, revoke.
  await created.getByRole('button', { name: 'Capabilities' }).click()
  const panel = window.getByTestId('library-capabilities')
  await panel.getByLabel('Grantee public keys').fill('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
  await panel.getByLabel('Add tags').check()
  await panel.getByLabel('Use a filter').check()
  await panel.getByTestId('filter-editor').getByLabel('Value').fill('house')
  step('filter', await panel.getByTestId('filter-summary').innerText())
  await panel.getByRole('button', { name: 'Issue', exact: true }).click()
  await toast(window, 'Capability issued.')
  const capability_row = panel.getByTestId('capability-row').first()
  await capability_row.and(window.locator('[data-status=active]')).waitFor()
  step('issued', (await capability_row.innerText()).replaceAll('\n', ' | ').replaceAll('\t', ' | '))
  await capability_row.getByRole('button', { name: 'Revoke' }).click()
  const revoke_text = await window.getByRole('dialog').innerText()
  if (!revoke_text.includes('not retroactive')) throw new Error('the revoke confirmation does not warn that revocation is not retroactive')
  await window.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click()
  await toast(window, 'Capability revoked.')
  await panel.getByTestId('capability-row').and(window.locator('[data-status=revoked]')).first().waitFor()
  step('revoked', 'listed as revoked')

  await created.getByRole('button', { name: 'Retire' }).click()
  await window.getByRole('dialog').getByRole('button', { name: 'Retire permanently' }).click()
  await toast(window, /^Retired /)
  await own_rows.filter({ hasText: 'Smoke Mixes' }).and(window.locator('[data-retired=true]')).waitFor()
  const retired_row = own_rows.filter({ hasText: 'Smoke Mixes' })
  if (await retired_row.getByRole('button', { name: /^(Retire|Profile)$/ }).count() !== 0) throw new Error('a retired library still offers Retire or Profile')
  await window.getByTestId('library-capabilities').getByText('This library is retired').waitFor()
  if (await window.getByTestId('issue-capability').count() !== 0) throw new Error('a retired library offers issuing')
  step('retired', 'marked retired; capabilities read-only')

  // Replication policy on a linked library: full by default, then selective
  // with a filter and an estimate, then index only.
  await window.getByLabel('Library address').fill(other.identity().own_address)
  await window.getByLabel('Alias').fill('Smoke Linked')
  await window.getByRole('button', { name: 'Link', exact: true }).click()
  const linked_row = window.getByTestId('library-row').filter({ hasText: 'Smoke Linked' })
  await linked_row.getByTestId('replication-mode').filter({ hasText: 'Full' }).waitFor()
  await linked_row.getByRole('button', { name: 'Change' }).click()
  const policy = window.getByTestId('replication-policy')
  await policy.getByLabel(/Selective/).check()
  await policy.getByLabel('Use a filter').check()
  await policy.getByTestId('filter-editor').getByLabel('Value').fill('keep')
  const estimate_text = await policy.getByTestId('storage-estimate').innerText()
  step('estimate', estimate_text)
  // The linked library is empty, so its audio size (Library.audio_size_bytes) is exactly zero.
  if (estimate_text !== '0 B of audio kept on this device.') throw new Error('the selective estimate is missing or not exact')
  await policy.getByRole('button', { name: 'Save' }).click()
  await toast(window, /set to selective/)
  await linked_row.getByTestId('replication-mode').filter({ hasText: 'Selective' }).waitFor()
  await linked_row.getByRole('button', { name: 'Change' }).click()
  await window.getByTestId('replication-policy').getByLabel(/Index only/).check()
  await window.getByTestId('replication-policy').getByRole('button', { name: 'Save' }).click()
  await linked_row.getByTestId('replication-mode').filter({ hasText: 'Index only' }).waitFor()
  step('replication policy', 'full, then selective with a filter, then index only')
  await nav(window, 'Identity')
  await window.getByTestId('identity-own-library').filter({ hasText: '(retired)' }).waitFor()
  await window.getByTestId('held-capabilities').getByText('No other identity has granted you a capability.').waitFor()
  step('held capabilities', await window.getByTestId('held-capabilities').innerText())
  step('identity own libraries', await window.getByTestId('identity-own-library').allInnerTexts())

  if (console_errors.length > 0) throw new Error(`renderer console errors: ${console_errors.join(' | ')}`)
  console.log('v1.1 smoke passed')
} finally {
  await app.close().catch(() => {})
  await stop_peer(other)
  await node.stop()
}
