// The packaged macOS app (`bun run package:mac` first), installed from its
// .dmg: it launches with its fuses set, serves the renderer from app://,
// starts the bundled record-node through utilityProcess, and plays a track
// from it. The node's data directory is seeded beforehand by an in-process
// record-node, since the bundled node cannot ingest until ffmpeg and fpcalc
// ship. Playwright's Electron launcher needs the inspect arguments the fuses
// turn off, so the app is driven over the Chrome DevTools Protocol instead.
// Needs ffmpeg and fpcalc for the seed. RECORD_PACKAGED_ARCH=x86_64 runs the
// Intel slice under Rosetta. Runs under Node:
// node test/e2e/packaged-smoke.ts [path to .dmg or .app]

import { execFileSync, spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, type Page } from 'playwright-core'
import { create_peer, start_peer, stop_peer } from 'record-node'

import { is_alive } from '#main/bundled/process-probe.ts'
import { bundled_state } from './bundled-run.ts'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const { version } = JSON.parse(await readFile(join(APP_ROOT, 'package.json'), 'utf8')) as { version: string }
const arch = process.env.RECORD_PACKAGED_ARCH ?? process.arch.replace('x64', 'x86_64')
const target = process.argv[2] ?? join(APP_ROOT, 'release', `Record-${version}-universal.dmg`)

const step = (label: string, detail: unknown = ''): void => { console.log(`${label}:`, detail) }
const wait_for = async <T>(read: () => Promise<T | null>, label: string, timeout_ms = 60_000): Promise<T> => {
  const deadline = Date.now() + timeout_ms
  for (;;) {
    const value = await read()
    if (value !== null) return value
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

const work_dir = await mkdtemp(join(tmpdir(), 'record-app-packaged-'))
let mount: string | null = null
try {
  // Install: mount the .dmg read-only and run the app from it.
  let app_path = target
  if (target.endsWith('.dmg')) {
    mount = join(work_dir, 'mount')
    execFileSync('hdiutil', ['attach', target, '-nobrowse', '-readonly', '-mountpoint', mount], { stdio: 'ignore' })
    app_path = join(mount, 'Record.app')
  }
  const binary = join(app_path, 'Contents', 'MacOS', 'Record')
  step('app', { binary, archs: execFileSync('lipo', ['-archs', binary], { encoding: 'utf8' }).trim() })

  // Seed the bundled node's data directory with one playable track.
  const data_dir = join(work_dir, 'node-data')
  const seed = await create_peer({ config: { data_dir, network: false, allow_toolchain_mismatch: true } })
  await start_peer(seed)
  const audio = join(work_dir, 'Packaged Smoke.flac')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=20:c=pink:seed=7:a=0.3', '-metadata', 'title=Packaged Smoke', audio])
  await seed.ingest_file(audio)
  await stop_peer(seed)
  const profile = join(work_dir, 'profile')
  await mkdir(profile)
  await writeFile(join(profile, 'bundled-settings.json'), JSON.stringify({ data_dir }))

  const app = spawn('arch', [`-${arch}`, binary, `--user-data-dir=${profile}`, '--remote-debugging-port=0'], { stdio: 'ignore' })
  const exited = new Promise<number | null>((resolve) => { app.once('exit', resolve) })
  try {
    const port = await wait_for(async () => {
      const text = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').catch(() => '')
      return text === '' ? null : text.split('\n')[0] ?? null
    }, 'the DevTools port')
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
    const window = await wait_for(async () => browser.contexts().flatMap((context) => context.pages()).find((page) => page.url().startsWith('app://record/')) ?? null, 'the app window') as Page
    const console_errors: string[] = []
    window.on('console', (message) => { if (message.type() === 'error') console_errors.push(message.text()) })
    step('renderer origin', await window.evaluate(() => location.origin))

    // The bundled node runs as a utility process, never as ELECTRON_RUN_AS_NODE.
    const running = await wait_for(async () => {
      const state = await bundled_state(window)
      if (state.status === 'failed') throw new Error(`the bundled node failed: ${JSON.stringify(state)}`)
      return state.status === 'running' ? state : null
    }, 'the bundled node')
    const child_command = execFileSync('ps', ['-o', 'command=', '-p', String(running.pid)], { encoding: 'utf8' }).trim()
    step('bundled node', { pid: running.pid, url: running.url, version: running.version, data_dir: running.data_dir, ingest_disabled: running.ingest_disabled })
    // Which of node-datachannel's two binaries the child loaded shows the slice it runs.
    const native = execFileSync('lsof', ['-p', String(running.pid)], { encoding: 'utf8' }).split('\n').find((line) => line.includes('node_datachannel.node'))?.match(/@node-datachannel\/([\w-]+)/)?.[1] ?? 'none'
    step('bundled node process', { native, command: child_command.slice(0, 160) })
    if (native !== `darwin-${arch.replace('x86_64', 'x64')}`) throw new Error(`the child loaded ${native} on ${arch}`)
    if (!child_command.includes('--type=utility')) throw new Error('the bundled node is not a utility process')
    if (running.data_dir !== data_dir) throw new Error('the bundled node ignored the configured data directory')

    // The RunAsNode fuse is off: the variable starts a second app instance on
    // this profile, which hands off to this one and exits, instead of
    // running the script as Node.
    const as_node = execFileSync(binary, ['-e', 'process.stdout.write("ran-as-node")', `--user-data-dir=${profile}`], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', timeout: 30_000 })
    step('ELECTRON_RUN_AS_NODE', as_node.includes('ran-as-node') ? 'honored' : 'ignored')
    if (as_node.includes('ran-as-node')) throw new Error('the RunAsNode fuse is on')

    // Play the seeded track.
    await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 30_000 })
    await window.getByRole('navigation').getByRole('link', { name: 'Tracks', exact: true }).click()
    const row = window.getByTestId('track-row').filter({ hasText: 'Packaged Smoke' })
    await row.getByRole('button', { name: 'Packaged Smoke', exact: true }).click()
    await window.locator('[data-testid=player-bar][data-state=playing]').waitFor({ timeout: 30_000 })
    const first = await window.getByTestId('player-position').innerText()
    await window.waitForTimeout(3_000)
    const later = await window.getByTestId('player-position').innerText()
    step('playback', { first, later, state: await window.getByTestId('player-bar').getAttribute('data-state') })
    if (first === later) throw new Error('playback did not advance')

    await window.getByRole('navigation').getByRole('link', { name: 'Diagnostics', exact: true }).click()
    step('diagnostics', (await window.getByTestId('diagnostics').innerText()).split('\n').slice(0, 30).join(' | '))
    if (console_errors.length > 0) throw new Error(`renderer console errors:\n${console_errors.join('\n')}`)
    await browser.close()

    // Quitting stops the child with the app.
    app.kill('SIGTERM')
    step('app exit code', await exited)
    await wait_for(async () => (is_alive(running.pid as number) ? null : true), 'the child to exit', 10_000)
    step('child after quit', 'gone')
  } finally {
    if (app.exitCode === null && app.signalCode === null) {
      app.kill('SIGKILL')
      await exited
    }
  }
  console.log('packaged smoke passed')
} finally {
  if (mount !== null) execFileSync('hdiutil', ['detach', mount, '-quiet'])
  await rm(work_dir, { recursive: true, force: true })
}
