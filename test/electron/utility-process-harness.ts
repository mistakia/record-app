// Runs inside Electron's main process (utilityProcess exists nowhere else):
// the bundled node manager spawning record-node through utilityProcess.fork,
// as the app does. bundled-utility-process.test.ts builds and runs this and
// reads the JSON it prints. Exits 0 when every check passed.

import { readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { app } from 'electron'

import { spawn_utility_process } from '#main/bundled/bundled-node.ts'
import { build_child_env } from '#main/bundled/child-env.ts'
import type { ChildHandle, SpawnChild } from '#main/bundled/child-handle.ts'
import { create_node_log } from '#main/bundled/node-log.ts'
import { create_node_manager } from '#main/bundled/node-manager.ts'
import { app_marker, carries_marker, CHILD_FILE } from '#main/bundled/node-orphan.ts'
import { describe_process, is_alive } from '#main/bundled/process-probe.ts'

const cli_path = process.argv.at(-1) as string
const results: Record<string, unknown> = {}
const failures: string[] = []
const check = (name: string, ok: boolean, detail: unknown) => {
  results[name] = detail
  if (!ok) failures.push(name)
}
const wait_for = async (condition: () => boolean, timeout_ms = 30_000) => {
  const deadline = Date.now() + timeout_ms
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('timed out')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

// Why a pid answers kill(pid, 0): what it is and every process still running
// record-node, read straight off /proc. /proc is Linux-only; elsewhere the
// stop either leaves nothing (macOS) or the diagnostic is out of reach.
const process_diagnostic = (pid: number): string => {
  if (process.platform !== 'linux') return '(no /proc on this platform)'
  const line = (at: number): string => {
    try {
      const stat = readFileSync(`/proc/${at}/stat`, 'utf8')
      const close = stat.lastIndexOf(')')
      const state = close === -1 ? '?' : stat[close + 2] ?? '?'
      const ppid_match = /\)\s+\S+\s+(\d+)/.exec(stat)
      const cmd = readFileSync(`/proc/${at}/cmdline`, 'utf8').split('\0').filter(Boolean).join(' ')
      return `${state === 'Z' ? 'ZOMBIE' : `state ${state}`} ppid ${ppid_match === null ? '?' : ppid_match[1]} cmd [${cmd}]`
    } catch {
      return '(gone)'
    }
  }
  const record_node: string[] = []
  for (const entry of readdirSync('/proc')) {
    if (!/^\d+$/.test(entry)) continue
    let cmd = ''
    try { cmd = readFileSync(`/proc/${entry}/cmdline`, 'utf8').split('\0').filter(Boolean).join(' ') } catch {}
    if (cmd.includes('record-node') && cmd.includes('cli.js')) record_node.push(`${entry} ${line(Number(entry))}`)
  }
  return `reported pid ${pid}: ${line(pid)}\nstill running record-node: ${record_node.length === 0 ? 'none' : '\n' + record_node.join('\n')}`
}

const make_manager = async (root: string, options: Partial<Parameters<typeof create_node_manager>[0]> = {}) => {
  const data_dir = join(root, 'node-data')
  const children: ChildHandle[] = []
  const spawn_child: SpawnChild = (input) => {
    const child = spawn_utility_process(input)
    children.push(child)
    return child
  }
  const manager = create_node_manager({
    spawn_child,
    cli_path,
    data_dir,
    config_path: join(root, 'bundled-node.json'),
    version: 'test',
    env: { ...process.env, NODE_OPTIONS: '--inspect=0' },
    orphan_marker: app_marker(process.execPath),
    log: create_node_log({ log_dir: join(root, 'logs') }),
    on_state: () => {},
    ...options
  })
  return { manager, children }
}

const run = async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-app-utility-'))
  try {
    const { manager, children } = await make_manager(root)
    await manager.start()
    await wait_for(() => manager.get_state().status === 'running')
    const first = manager.get_state()
    const settings = await (await fetch(`${first.url}/api/settings`)).json() as { peer_id: string }
    check('healthy and pinned', settings.peer_id === first.node_key_pin?.peer_id, { url: first.url, pid: first.pid, peer_id: settings.peer_id })
    // An orphan is found by its recorded PID and the app's marker in its
    // command line, which a utility child's must therefore carry.
    const recorded = JSON.parse(await readFile(join(root, 'node-data', CHILD_FILE), 'utf8')) as { pid: number }
    const info = await describe_process(first.pid as number)
    check('child recorded, carrying the app marker', recorded.pid === first.pid && info !== null && carries_marker(info, app_marker(process.execPath)), { recorded, marker: app_marker(process.execPath), executable: info?.executable, command: info?.command.slice(0, 200) })

    // The environment: a NODE_OPTIONS in the app never reaches the child.
    const dump = join(root, 'env.mjs')
    // A utility process stays up after its event loop empties, so it exits itself.
    await writeFile(dump, 'console.log(JSON.stringify(process.env)); process.exit(0)\n')
    const env_child = spawn_utility_process({ cli_path: dump, args: [], env: build_child_env({ ...process.env, NODE_OPTIONS: '--inspect=0' }) })
    let env_text = ''
    env_child.stdout?.on('data', (data) => { env_text += String(data) })
    await env_child.exited
    // On Linux the exit can land before the last stdout chunk, and a utility
    // child's stdout never reports its end, so wait for a whole line.
    for (let waited = 0; !env_text.endsWith('\n') && waited < 2_000; waited += 20) await new Promise((resolve) => setTimeout(resolve, 20))
    const child_env = JSON.parse(env_text) as Record<string, string>
    check('no NODE_OPTIONS in the child', child_env.NODE_OPTIONS === undefined, Object.keys(child_env).sort())

    // A crash restarts on the same URL.
    process.kill(first.pid as number, 'SIGKILL')
    await wait_for(() => manager.get_state().status === 'restarting')
    const restarting = manager.get_state()
    await wait_for(() => manager.get_state().status === 'running')
    check('restart after a crash', manager.get_state().url === first.url && manager.get_state().pid !== first.pid, { error: restarting.error, pid: manager.get_state().pid })

    // A clean stop. On Linux the non-started child re-spawns on a new pid
    // that must also die with the loop; report what is left behind when it
    // does not.
    const pid = manager.get_state().pid as number
    const before_stop = process_diagnostic(pid)
    await manager.stop()
    await Promise.all(children.map(async (child) => { await child.exited }))
    const alive_at_stop = is_alive(pid)
    await new Promise((resolve) => setTimeout(resolve, 1_000))
    const alive_after_1s = is_alive(pid)
    check('clean stop', !alive_at_stop && manager.get_state().status === 'stopped', {
      pid,
      alive_at_stop,
      alive_after_1s,
      children_exited: children.every((child) => !child.alive()),
      before_stop,
      after_stop: process_diagnostic(pid)
    })

    // A stop during each step of a start leaves no child.
    for (const step of ['port', 'config', 'spawned']) {
      const step_root = await mkdtemp(join(tmpdir(), 'record-app-utility-step-'))
      let stop: (() => Promise<void>) | null = null
      const stopped: Array<Promise<void>> = []
      const { manager: stepped, children: step_children } = await make_manager(step_root, {
        checkpoint: async (at) => { if (at === step && stop !== null) stopped.push(stop()) }
      })
      stop = stepped.stop
      await stepped.start()
      await Promise.all(stopped)
      await Promise.all(step_children.map(async (child) => { await child.exited }))
      const alive = step_children.filter((child) => child.alive()).length
      check(`stop during ${step}`, alive === 0 && stepped.get_state().status === 'stopped', { alive, status: stepped.get_state().status })
      await rm(step_root, { recursive: true, force: true })
    }
    check('log written', (await readFile(join(root, 'logs', 'node.log'), 'utf8')).includes('listening on'), 'node.log has the listening line')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

app.whenReady()
  .then(run)
  .catch((error: unknown) => { failures.push(`error: ${String(error)}`) })
  .finally(() => {
    console.log(`HARNESS ${JSON.stringify({ results, failures })}`)
    app.exit(failures.length === 0 ? 0 : 1)
  })
