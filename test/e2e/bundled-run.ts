// The bundled-mode part of smoke:local. A fresh profile starts in bundled
// mode (spec 8.3.3): the app spawns its own record-node, which must answer,
// show its details, survive a crash, and stop when the user switches to a
// remote node, after the confirmation 8.3.4 requires. On the way it reads
// Diagnostics (8.9.1) and moves the data directory (8.4.1).

import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import type { ElectronApplication, Page } from 'playwright-core'

import { is_alive } from '#main/bundled/process-probe.ts'

interface BundledView { status: string, pid: number | null, port: number | null, url: string | null, version: string, ingest_disabled: string | null, data_dir: string, log_path: string }

export const bundled_state = async (window: Page): Promise<BundledView> =>
  await window.evaluate(async () => await (window as unknown as { record: { bundled: { get_state: () => Promise<BundledView> } } }).record.bundled.get_state())

const wait_running = async (window: Page, not_pid: number | null = null): Promise<BundledView> => {
  const deadline = Date.now() + 60_000
  for (;;) {
    const state = await bundled_state(window)
    if (state.status === 'running' && state.pid !== not_pid) return state
    if (state.status === 'failed') throw new Error(`the bundled node failed: ${JSON.stringify(state)}`)
    if (Date.now() > deadline) throw new Error(`the bundled node did not come up: ${JSON.stringify(state)}`)
    await window.waitForTimeout(200)
  }
}

// The bundled ingest: the pinned ffmpeg and fpcalc pass record-node's
// preflight, a dropped file is ingested end to end, and URL import says it is
// off. On macOS the toolchain must be built (cli/build-toolchain.sh); elsewhere
// (Linux CI) there is none, and the page must say ingest is off instead.
export const check_bundled_ingest = async ({ window, step, audio_path, title, tracks_before = 0 }: {
  window: Page
  step: (label: string, detail?: unknown) => void
  audio_path: string
  title: string
  tracks_before?: number
}): Promise<void> => {
  const state = await bundled_state(window)
  await window.getByRole('navigation').getByRole('link', { name: 'Import', exact: true }).click()
  step('URL import in bundled mode', await window.getByTestId('url-import-off').innerText())
  if (process.platform !== 'darwin' && state.ingest_disabled !== null) {
    step('import page in bundled mode', await window.getByTestId('ingest-disabled').innerText())
    return
  }
  if (state.ingest_disabled !== null) throw new Error(`the bundled node refused its toolchain: ${state.ingest_disabled} (run cli/build-toolchain.sh)`)
  step('bundled toolchain', 'accepted by the preflight')
  const dropped = { name: basename(audio_path), base64: (await readFile(audio_path)).toString('base64') }
  await window.evaluate(async ({ name, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    const transfer = new DataTransfer()
    transfer.items.add(new File([bytes], name))
    document.querySelector('[data-testid=drop-zone]')?.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }))
  }, dropped)
  const item = window.locator('[data-testid=import-item][data-finished=true]').last()
  await item.waitFor({ timeout: 60_000 })
  step('bundled file import', (await item.innerText()).replaceAll('\n', ' | '))
  await window.getByRole('navigation').getByRole('link', { name: 'Tracks', exact: true }).click()
  await window.getByTestId('track-total').filter({ hasText: new RegExp(`^${tracks_before + 1} tracks$`) }).waitFor({ timeout: 30_000 })
  await window.getByTestId('track-row').filter({ hasText: title }).first().waitFor()
  step('bundled library after ingest', `${tracks_before + 1} tracks, including ${title}`)
}

export const run_bundled_checks = async ({ app, window, step, remote_url, user_data_dir, audio_path }: {
  app: ElectronApplication
  window: Page
  step: (label: string, detail?: unknown) => void
  remote_url: string
  user_data_dir: string
  audio_path: string
}): Promise<void> => {
  const started = await wait_running(window)
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  step('bundled node', { status: started.status, url: started.url, pid: started.pid, version: started.version, ingest_disabled: started.ingest_disabled })

  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  step('bundled details', (await window.getByTestId('bundled-details').innerText()).replaceAll('\n', ' | '))
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  step('bundled test connection', await window.getByTestId('connection-test-result').innerText())
  await check_bundled_ingest({ window, step, audio_path, title: 'Smoke Bundled' })

  // A crash: the banner says so, and the node is back on the same port.
  process.kill(started.pid as number, 'SIGKILL')
  await window.locator('[data-testid=bundled-banner][data-status=restarting], [data-testid=bundled-banner][data-status=starting]').first().waitFor({ timeout: 10_000 })
  const restarted = await wait_running(window, started.pid)
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  step('after a crash', { pid: restarted.pid, url: restarted.url, same_url: restarted.url === started.url })

  // Diagnostics: the child's PID, and the node log inside this profile, not
  // the real ~/Library/Logs.
  await window.getByRole('navigation').getByRole('link', { name: 'Diagnostics', exact: true }).click()
  await window.getByTestId('diagnostics-bundled-pid').filter({ hasText: `PID ${restarted.pid}` }).waitFor({ timeout: 10_000 })
  step('diagnostics', (await window.getByTestId('diagnostics').innerText()).split('\n').slice(0, 24).join(' | '))
  if (!restarted.log_path.startsWith(await realpath(user_data_dir))) throw new Error(`the node log is outside the profile: ${restarted.log_path}`)

  // Move the data directory: main's picker and confirmation (stubbed in main,
  // as the user's answers), then the node restarts in the new place.
  // The node gets its own private subfolder of the chosen folder, which keeps
  // its own permissions and contents.
  const chosen_dir = join(await realpath(user_data_dir), '..', 'chosen-folder')
  await mkdir(chosen_dir, { mode: 0o755 })
  await writeFile(join(chosen_dir, 'notes.txt'), 'the user\'s own file')
  const moved_dir = join(await realpath(chosen_dir), 'Record Node Data')
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false })
  }, chosen_dir)
  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  await window.getByTestId('bundled-details').getByRole('button', { name: 'Change', exact: true }).click()
  const deadline = Date.now() + 60_000
  let moved = await bundled_state(window)
  while (!(moved.status === 'running' && moved.data_dir === moved_dir)) {
    if (moved.status === 'failed' || Date.now() > deadline) throw new Error(`the node did not move: ${JSON.stringify(moved)}`)
    await window.waitForTimeout(200)
    moved = await bundled_state(window)
  }
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  const mode = ((await stat(moved_dir)).mode & 0o777).toString(8)
  const chosen_mode = ((await stat(chosen_dir)).mode & 0o777).toString(8)
  step('after moving the data directory', { data_dir: moved.data_dir, mode, chosen_mode, pid: moved.pid, old_child_alive: is_alive(restarted.pid as number) })
  if (is_alive(restarted.pid as number)) throw new Error('the old child outlived the move')
  if (mode !== '700' || chosen_mode !== '755') throw new Error(`the data folder is ${mode} and the chosen folder ${chosen_mode}; expected 700 and an untouched 755`)

  // Switch to remote: confirmed, and the bundled child stops.
  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  await window.getByLabel('Remote node').check()
  await window.locator('input[name=node_url]').fill(remote_url)
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  step('switch confirmation', await window.getByRole('dialog').innerText())
  await window.getByRole('dialog').getByRole('button', { name: 'Switch' }).click()
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  const stopped = await bundled_state(window)
  step('after switching to remote', { status: stopped.status, child_alive: is_alive(moved.pid as number) })
  if (stopped.status !== 'stopped' || is_alive(moved.pid as number)) throw new Error('the bundled node kept running after the switch')
}

// Quitting in bundled mode stops the child before the app exits (8.4.5).
export const check_quit_stops_child = async ({ launch, step }: {
  launch: () => Promise<{ app: ElectronApplication, window: Page }>
  step: (label: string, detail?: unknown) => void
}): Promise<void> => {
  const { app, window } = await launch()
  const running = await wait_running(window)
  await app.close()
  step('quit in bundled mode', { child_pid: running.pid, child_alive_after_quit: is_alive(running.pid as number) })
  if (is_alive(running.pid as number)) throw new Error('the bundled node outlived the app')
}
