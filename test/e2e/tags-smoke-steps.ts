// The Tags page in the local smoke, against its in-process node: `g #`
// opens it, `/` focuses its filter, `f` there falls through to adopting the
// playing track (the tag list answers no adopt), `e` renames a label
// through the confirm, the Tracks page shows the new chip, and Backspace
// deletes it. Called by local-smoke.ts while a track is current.

import { join } from 'node:path'

import type { ElectronApplication, Page } from 'playwright-core'

import { capture } from './launch.ts'
import { node_json, until } from './node-helpers.ts'

export const run_tags_steps = async ({ app, window, node_url, step, screenshot_dir }: {
  app: ElectronApplication
  window: Page
  node_url: string
  step: (label: string, detail?: unknown) => void
  screenshot_dir: string
}): Promise<void> => {
  const node = async <T>(path: string, init?: RequestInit): Promise<T> => await node_json<T>(node_url, path, init)
  const go = async (key: string) => {
    await window.keyboard.press('g')
    await window.keyboard.press(key)
  }
  const tag_count = async (tag: string): Promise<number> =>
    (await node<Array<{ tag: string, count: number }>>(`/tags?prefix=${encodeURIComponent(tag)}`)).find((row) => row.tag === tag)?.count ?? 0
  // The job writes after the dialog closes, so the node is polled for its outcome.
  const wait_count = async (tag: string, expected: number): Promise<void> => { await until(async () => await tag_count(tag) === expected, `${tag} counting ${expected}`) }

  // A label of the person's own, in the labels library (no target named).
  const { items } = await node<{ items: Array<{ id: string, title?: string }> }>('/tracks?offset=0&limit=10')
  const alpha = items.find(({ title }) => title === 'Smoke Alpha')
  if (alpha === undefined) throw new Error('no Smoke Alpha on the node')
  await node('/tags', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ track_id: alpha.id, tag: 'smoke-rename' }) })

  await go('#')
  const index = window.getByTestId('tag-index')
  await index.waitFor()
  // Facets open folded; opening the hand labels shows the new label.
  await index.getByRole('button', { name: 'Unfold hand labels', expanded: false }).click({ timeout: 10_000 })
  await index.locator('[data-label="smoke-rename"]').waitFor()
  step('g #', 'opened Tags folded; unfolded the hand labels')

  // `f` on the tag list adopts the playing track: the list answers no adopt.
  await index.focus()
  await window.keyboard.press('f')
  await window.getByTestId('adopt-dialog').waitFor({ timeout: 5_000 })
  await window.keyboard.press('Escape')
  await window.getByTestId('adopt-dialog').waitFor({ state: 'detached' })
  step('f on Tags', 'fell through to adopting the playing track')

  await window.keyboard.press('/')
  const filter = window.getByTestId('tags-filter')
  if (!await filter.evaluate((input) => input === document.activeElement)) throw new Error('/ did not focus the Tags filter')
  await filter.fill('smoke-rename')
  await window.keyboard.press('Enter')
  // The cursor starts on the facet header; j moves to the label.
  await window.keyboard.press('j')
  await window.keyboard.press('e')
  const dialog = window.getByTestId('relabel-dialog')
  await dialog.waitFor()
  await dialog.getByTestId('relabel-name').fill('smoke-renamed')
  // One track, in one library.
  const facts = dialog.getByTestId('relabel-scope')
  await facts.locator('dt:text-is("Tracks") + dd').filter({ hasText: /^1$/ }).waitFor()
  if (await facts.locator('dt:text-is("In") + dd > span').count() !== 1) throw new Error('the rename did not name one library')
  await capture(app, join(screenshot_dir, 'record-app-tags-dialog.png'))
  await dialog.getByTestId('relabel-confirm').click()
  await window.getByTestId('toast').filter({ hasText: 'Relabelled 1 track' }).first().waitFor({ timeout: 30_000 })
  await wait_count('smoke-rename', 0)
  await wait_count('smoke-renamed', 1)
  step('rename with e', 'smoke-rename is smoke-renamed on the node')

  await go('t')
  await window.getByTestId('track-row').filter({ hasText: 'smoke-renamed' }).first().waitFor({ timeout: 10_000 })
  step('Tracks', 'shows the smoke-renamed chip')

  await go('#')
  await window.getByTestId('tags-filter').fill('smoke-renamed')
  await window.getByTestId('tags-filter').press('Enter')
  await window.keyboard.press('j')
  await capture(app, join(screenshot_dir, 'record-app-tags.png'))
  await window.keyboard.press('Backspace')
  await dialog.waitFor()
  await dialog.getByTestId('relabel-confirm').filter({ hasText: 'Delete' }).click()
  await wait_count('smoke-renamed', 0)
  await window.getByTestId('tags-filter').fill('')
  step('delete with Backspace', 'smoke-renamed gone from the node')
}
