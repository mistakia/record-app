// The packaged macOS app, installed from its .dmg. Needs both builds: the
// release in release/ (`bun run package:mac`, or the Package workflow's signed
// build on a tag) and the same app with the test-build marker in
// release-test/ (`bun run package:mac:test`, likewise). Both carry exactly the expected fuses, read back from the
// binary. The release refuses to start with remote debugging. The test build,
// which accepts it, is driven over the Chrome DevTools Protocol (Playwright's
// Electron launcher needs the inspect arguments the fuses turn off): it
// serves the renderer from app://, starts the bundled record-node through
// utilityProcess, plays a track, and ingests a file through its bundled
// ffmpeg and fpcalc. The node's data directory is seeded beforehand by an
// in-process record-node, which needs ffmpeg and fpcalc.
// RECORD_PACKAGED_ARCH=x86_64 runs the Intel slice under Rosetta. Runs under
// Node: node test/e2e/packaged-smoke.ts [test .dmg] [release .dmg]

import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FuseState, FuseV1Options, getCurrentFuseWire } from '@electron/fuses'
import { chromium, type Page } from 'playwright-core'
import { create_peer, start_peer, stop_peer } from 'record-node'

import { is_alive } from '#main/bundled/process-probe.ts'
import { bundled_state, check_bundled_ingest } from './bundled-run.ts'

const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const { version } = JSON.parse(await readFile(join(APP_ROOT, 'package.json'), 'utf8')) as { version: string }
const arch = process.env.RECORD_PACKAGED_ARCH ?? process.arch.replace('x64', 'x86_64')
const test_dmg = process.argv[2] ?? join(APP_ROOT, 'release-test', `Record-${version}-universal.dmg`)
const release_dmg = process.argv[3] ?? join(APP_ROOT, 'release', `Record-${version}-universal.dmg`)

// electron-builder.yml's electronFuses, with WasmTrapHandlers at Electron's
// default (on), which electron-builder does not set.
const EXPECTED_FUSES: Record<string, boolean> = {
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
  [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  [FuseV1Options.WasmTrapHandlers]: true
}

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
const mounts: string[] = []

// A signed app's volume can stay busy for a few seconds after it quits while
// macOS assesses it, so the detach retries before forcing.
const detach = async (mount: string): Promise<void> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (spawnSync('hdiutil', ['detach', mount, '-quiet']).status === 0) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  execFileSync('hdiutil', ['detach', mount, '-force', '-quiet'])
}

// Install: mount the .dmg read-only, and run the app from it.
const install = async (dmg: string, name: string): Promise<{ app_path: string, binary: string }> => {
  const mount = join(work_dir, name)
  execFileSync('hdiutil', ['attach', dmg, '-nobrowse', '-readonly', '-mountpoint', mount], { stdio: 'ignore' })
  mounts.push(mount)
  const app_path = join(mount, 'Record.app')
  return { app_path, binary: join(app_path, 'Contents', 'MacOS', 'Record') }
}

const check_fuses = async (app_path: string, label: string): Promise<void> => {
  const wire = await getCurrentFuseWire(app_path)
  const read = Object.fromEntries(Object.entries(wire).filter(([key]) => key !== 'version').map(([key, state]) => [key, state === FuseState.ENABLE]))
  step(`${label} fuses`, Object.fromEntries(Object.entries(read).map(([key, on]) => [FuseV1Options[Number(key)] ?? key, on])))
  if (JSON.stringify(read) !== JSON.stringify(EXPECTED_FUSES)) throw new Error(`the ${label} fuses differ from the expected set`)
}

try {
  // The release build: its fuses, and its refusal of remote debugging.
  const release = await install(release_dmg, 'release')
  await check_fuses(release.app_path, 'release')
  const release_profile = join(work_dir, 'release-profile')
  // A cold first launch under Rosetta translates the whole framework, which
  // took over 30 s on the hosted runner; the test build's launch below waits
  // as long. A release that ignored the switch
  // would also run until the timeout, so a timeout still fails.
  const refused = spawnSync('arch', [`-${arch}`, release.binary, `--user-data-dir=${release_profile}`, '--remote-debugging-port=0'], { encoding: 'utf8', timeout: 120_000 })
  const port_file = await readFile(join(release_profile, 'DevToolsActivePort'), 'utf8').catch(() => null)
  step('release with --remote-debugging-port', { exit_code: refused.status, signal: refused.signal, stderr: refused.stderr.trim().split('\n').at(-1), devtools_port_file: port_file !== null })
  if (port_file !== null) throw new Error('the release build ran with remote debugging')
  if (refused.status === null) throw new Error('the release build did not exit within 120 s of being given --remote-debugging-port')
  if (refused.status !== 1) throw new Error(`the release build exited ${refused.status}, not 1, on --remote-debugging-port`)

  const { app_path, binary } = await install(test_dmg, 'test')
  await check_fuses(app_path, 'test build')
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
    }, 'the DevTools port', 120_000)
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

    // The bundled toolchain from Resources/bin: the preflight accepts it and a file ingests.
    const config = JSON.parse(await readFile(join(profile, 'bundled-node.json'), 'utf8')) as { ffmpeg_path?: string, fpcalc_path?: string }
    step('bundled toolchain paths', config)
    if (!(config.ffmpeg_path ?? '').startsWith(join(await realpath(app_path), 'Contents', 'Resources', 'bin'))) throw new Error('the bundled node is not using the packaged ffmpeg')
    const ingest_audio = join(work_dir, 'Packaged Ingest.flac')
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anoisesrc=d=8:c=brown:seed=11:a=0.3', '-metadata', 'title=Packaged Ingest', ingest_audio])
    await check_bundled_ingest({ window, step, audio_path: ingest_audio, title: 'Packaged Ingest', tracks_before: 1 })

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
  for (const mount of mounts) await detach(mount)
  await rm(work_dir, { recursive: true, force: true })
}
