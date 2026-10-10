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

import { type Page } from 'playwright-core'

import { create_peer, start_peer, stop_peer } from 'record-node'

import { start_test_node } from '../integration/node-fixture.ts'
import { assert_quiet, launch_app } from './launch.ts'

const node = await start_test_node()
await node.peer.ingest_file(node.make_audio({ name: 'V11 Alpha.flac', seed: 11 }))
const other = await create_peer({ config: { network: false, allow_toolchain_mismatch: true } })
await start_peer(other)
const user_data_dir = join(node.work_dir, 'profile')
// Start in remote mode against the in-process node, so no bundled node runs.
await mkdir(user_data_dir, { recursive: true })
await writeFile(join(user_data_dir, 'connection.json'), JSON.stringify({ mode: 'remote', node_url: node.node_url }))

const step = (label: string, detail: unknown = ''): void => { console.log(`${label}:`, detail) }
// The sidebar's links; the first 'Tracks' is every library, and with more
// than one own library My library lists each by name.
const nav = async (window: Page, name: string) => { await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name, exact: true }).first().click() }
const unfold = async (window: Page, title: string) => {
  const toggle = window.getByRole('button', { name: title })
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
}
// The library the track list shows, from the hash route's query.
const viewed_library = async (window: Page) => await window.evaluate(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('library') ?? '')
const toast = async (window: Page, text: string | RegExp) => { await window.getByTestId('toast').filter({ hasText: text }).first().waitFor({ timeout: 30_000 }) }

const app = await launch_app({ user_data_dir })
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
  await window.getByRole('button', { name: 'New library' }).click()
  await window.getByLabel('Library name').fill('Smoke Mixes')
  await window.getByRole('button', { name: 'Continue' }).click()
  const suggested = await window.getByLabel('Address name').inputValue()
  if (suggested !== 'smoke-mixes') throw new Error(`the address name was not suggested from the name: ${suggested}`)
  await window.getByRole('button', { name: 'Create library' }).click()
  await toast(window, 'Library created.')
  await window.getByTestId('library-profile-tab').getByTestId('about-editor').locator('input[name=name]').and(window.locator('[value="Smoke Mixes"]')).waitFor()
  await nav(window, 'Libraries')
  const created = own_rows.filter({ hasText: 'Smoke Mixes' })
  await created.waitFor()
  step('created', (await created.innerText()).replaceAll('\n', ' | '))
  step('profile', 'a new library lands on its Profile tab')

  // Write targets: two own libraries now, so writes offer a selector.
  await nav(window, 'Tracks')
  await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name: 'Add music' }).click()
  // The test id also marks the interim "Finding…" and single-target spans,
  // so wait for the selector itself, holding the new library.
  const import_target = window.locator('select[data-testid=write-target]')
  await import_target.locator('option', { hasText: 'Smoke Mixes' }).waitFor({ state: 'attached' })
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
  await nav(window, 'Smoke Mixes')
  await window.getByTestId('track-total').filter({ hasText: /^1 tracks$/ }).waitFor()
  step('adopted', 'V11 Alpha is in Smoke Mixes')
  await row.getByRole('cell').nth(2).click()
  await window.keyboard.press('t')
  const editor = window.getByTestId('tag-editor')
  // Viewing Smoke Mixes, the tag goes there by default.
  const viewed = await viewed_library(window)
  if (viewed === '' || await editor.getByTestId('write-target').getAttribute('data-library') !== viewed) throw new Error('the tag target is not the viewed library')
  await editor.getByLabel('New tag').fill('v11-tag')
  await editor.getByLabel('New tag').press('Enter')
  await editor.locator('li[aria-busy=false]').filter({ hasText: 'v11-tag' }).waitFor()
  step('tagged', (await editor.getByRole('listitem').allInnerTexts()).join(' | '))
  await editor.getByLabel('New tag').press('Escape')
  await editor.waitFor({ state: 'detached' })
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
  // Holders show in the inspector: the cursor on the row, then i.
  await nav(window, 'Tracks')
  await window.getByTestId('track-total').filter({ hasText: /^1 tracks$/ }).waitFor()
  await row.getByRole('cell').nth(2).click()
  await window.keyboard.press('i')
  const holders = window.getByTestId('inspector').getByTestId('track-holders')
  await holders.filter({ hasText: /^in 2 of yours$/ }).waitFor()
  step('holders', await holders.innerText())
  await row.click({ button: 'right' })
  await window.getByRole('menuitem', { name: 'Remove from library' }).click()
  const remove = window.getByTestId('remove-dialog')
  await remove.getByLabel('Library to remove from').selectOption({ label: 'Smoke Mixes' })
  await remove.getByRole('button', { name: 'Remove', exact: true }).click()
  await toast(window, 'Removed from Smoke Mixes.')
  await holders.filter({ hasText: /^in 1 of yours$/ }).waitFor()
  step('removed', 'V11 Alpha left Smoke Mixes and stays in the default library')
  await nav(window, 'Libraries')

  // Capability management on the new library's Writers tab: issue with a
  // filter, revoke.
  await created.getByRole('link').first().click()
  await window.getByRole('tab', { name: 'Writers' }).click()
  // Issuing is a step flow: who, what, and for how long, with the filter
  // behind advanced.
  await window.getByTestId('issue-capability').click()
  const flow = window.getByTestId('step-form')
  await flow.getByLabel('Grantee public keys').fill('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
  await flow.getByRole('button', { name: 'Continue' }).click()
  await flow.getByLabel('Add tags').check()
  step('actions', await flow.locator('p').last().innerText())
  await flow.getByRole('button', { name: 'Continue' }).click()
  await flow.getByLabel('One week').check()
  await flow.getByRole('button', { name: 'show advanced' }).click()
  await flow.getByLabel('Use a filter').check()
  await flow.getByTestId('filter-editor').getByLabel('Value').fill('house')
  step('filter', await flow.getByTestId('filter-summary').innerText())
  await flow.getByRole('button', { name: 'Issue', exact: true }).click()
  await toast(window, 'Capability issued.')
  const panel = window.getByTestId('library-capabilities')
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

  await window.getByRole('tab', { name: 'Profile' }).click()
  await unfold(window, 'Retire')
  await window.getByRole('button', { name: 'Retire library' }).click()
  await window.getByRole('dialog').getByRole('button', { name: 'Retire permanently' }).click()
  await toast(window, /Retired /)
  // Retiring lands on Writers, read-only, and the Profile tab is gone.
  await window.getByTestId('library-capabilities').getByText('This library is retired').waitFor()
  if (await window.getByTestId('issue-capability').count() !== 0) throw new Error('a retired library offers issuing')
  if (await window.getByRole('tab', { name: 'Profile' }).count() !== 0) throw new Error('a retired library still offers its Profile')
  await nav(window, 'Libraries')
  await own_rows.filter({ hasText: 'Smoke Mixes' }).and(window.locator('[data-retired=true]')).waitFor()
  step('retired', 'marked retired; capabilities read-only')

  // Replication policy on a linked library: full by default, then selective
  // with a filter and an estimate, then index only.
  await window.getByRole('link', { name: 'Link a library' }).first().click()
  await window.getByLabel('Library address').fill(other.identity().own_address)
  await window.getByRole('button', { name: 'Continue' }).click()
  await window.getByLabel('Alias').fill('Smoke Linked')
  await window.getByRole('button', { name: 'Link library' }).click()
  await window.getByTestId('library-profile').filter({ hasText: 'Smoke Linked' }).waitFor()
  await nav(window, 'Libraries')
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
  await unfold(window, 'Capabilities held')
  await window.getByTestId('held-capabilities').getByText('No other identity has granted you a capability.').waitFor()
  step('held capabilities', await window.getByTestId('held-capabilities').innerText())
  step('identity own libraries', await window.getByTestId('identity-own-library').allInnerTexts())

  if (console_errors.length > 0) throw new Error(`renderer console errors: ${console_errors.join(' | ')}`)
  await assert_quiet(app)
  step('quiet', 'no system focus taken, every window muted')
  console.log('v1.1 smoke passed')
} finally {
  await app.close().catch(() => {})
  await stop_peer(other)
  await node.stop()
}
