// The bundled-mode part of smoke:local. A fresh profile starts in bundled
// mode (spec 8.3.3): the app spawns its own record-node, which must answer,
// show its details, survive a crash, and stop when the user switches to a
// remote node, after the confirmation 8.3.4 requires.

import type { ElectronApplication, Page } from 'playwright-core'

import { is_alive } from '#main/bundled/process-probe.ts'

interface BundledView { status: string, pid: number | null, port: number | null, url: string | null, version: string, ingest_disabled: string | null, data_dir: string }

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

export const run_bundled_checks = async ({ window, step, remote_url }: {
  app: ElectronApplication
  window: Page
  step: (label: string, detail?: unknown) => void
  remote_url: string
}): Promise<void> => {
  const started = await wait_running(window)
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  step('bundled node', { status: started.status, url: started.url, pid: started.pid, version: started.version, ingest_disabled: started.ingest_disabled })

  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  step('bundled details', (await window.getByTestId('bundled-details').innerText()).replaceAll('\n', ' | '))
  await window.getByRole('button', { name: 'Test connection', exact: true }).click()
  step('bundled test connection', await window.getByTestId('connection-test-result').innerText())
  await window.getByRole('navigation').getByRole('link', { name: 'Import', exact: true }).click()
  // The pinned ffmpeg and fpcalc are not bundled yet, so ingest is usually off.
  if (started.ingest_disabled !== null) {
    await window.getByTestId('ingest-disabled').waitFor({ timeout: 10_000 })
    step('import page in bundled mode', await window.getByTestId('ingest-disabled').innerText())
  } else {
    step('import page in bundled mode', 'ingest enabled (the pinned tools are present)')
  }

  // A crash: the banner says so, and the node is back on the same port.
  process.kill(started.pid as number, 'SIGKILL')
  await window.locator('[data-testid=bundled-banner][data-status=restarting], [data-testid=bundled-banner][data-status=starting]').first().waitFor({ timeout: 10_000 })
  const restarted = await wait_running(window, started.pid)
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  step('after a crash', { pid: restarted.pid, url: restarted.url, same_url: restarted.url === started.url })

  // Switch to remote: confirmed, and the bundled child stops.
  await window.getByRole('navigation').getByRole('link', { name: 'Connection', exact: true }).click()
  await window.getByLabel('Remote node').check()
  await window.locator('input[name=node_url]').fill(remote_url)
  await window.getByRole('button', { name: 'Save', exact: true }).click()
  step('switch confirmation', await window.getByRole('dialog').innerText())
  await window.getByRole('dialog').getByRole('button', { name: 'Switch' }).click()
  await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
  const stopped = await bundled_state(window)
  step('after switching to remote', { status: stopped.status, child_alive: is_alive(restarted.pid as number) })
  if (stopped.status !== 'stopped' || is_alive(restarted.pid as number)) throw new Error('the bundled node kept running after the switch')
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
