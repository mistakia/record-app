// The bundled Tor client's lifecycle against a fake tor: its arguments, when
// it counts as ready, and what a failed start and a stop leave behind.

import { afterEach, describe, expect, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough } from 'node:stream'

import { bundled_network } from '#main/bundled/bundled-network.ts'
import { create_tor_manager, tor_arguments, type SpawnTor } from '#main/bundled/tor-manager.ts'

const directories: string[] = []
afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true })
})

// The manager creates its data directory and torrc before it spawns.
const spawned_count = async (spawned: unknown[], count: number): Promise<void> => {
  const deadline = Date.now() + 2_000
  while (spawned.length < count) {
    if (Date.now() > deadline) throw new Error(`tor was not spawned ${count} times`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

const temporary_dir = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'record-app-tor-'))
  directories.push(directory)
  return join(directory, 'tor')
}

const fake_tor = () => {
  const spawned: Array<{ command: string, args: string[], child: ReturnType<typeof make_child> }> = []
  const make_child = () => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      exitCode: null as number | null,
      pid: 4242,
      signals: [] as string[],
      kill: (signal?: string) => {
        child.signals.push(signal ?? 'SIGTERM')
        child.exitCode = 0
        setImmediate(() => child.emit('exit', 0, null))
        return true
      }
    })
    return child
  }
  const spawn: SpawnTor = (command, args) => {
    const child = make_child()
    spawned.push({ command, args, child })
    return child as unknown as ReturnType<SpawnTor>
  }
  return { spawn, spawned }
}

describe('tor manager', () => {
  test('runs tor on a loopback SOCKS port with its own torrc, and is ready once bootstrapped', async () => {
    const data_dir = await temporary_dir()
    const { spawn, spawned } = fake_tor()
    const tor = create_tor_manager({ tor_path: '/app/bin/tor', data_dir, log: () => {}, spawn, pick_port: async () => 39050, owner_pid: 77 })
    const ready = tor.ready()
    await spawned_count(spawned, 1)
    const [run] = spawned
    expect(run?.command).toBe('/app/bin/tor')
    expect(run?.args).toEqual(tor_arguments({ data_dir, socks_port: 39050, torrc_path: join(data_dir, 'torrc'), owner_pid: 77 }))
    expect(run?.args).toContain('127.0.0.1:39050')
    expect((await stat(data_dir)).mode & 0o777).toBe(0o700)

    run?.child.stdout.write('[notice] Opened Socks listener connection (ready) on 127.0.0.1:39050\n')
    run?.child.stdout.write('[notice] Bootstrapped 100% (done): Done\n')
    expect(await ready).toBe('127.0.0.1:39050')
    // A second caller shares the running Tor.
    expect(await tor.ready()).toBe('127.0.0.1:39050')
    expect(spawned).toHaveLength(1)

    await tor.stop()
    expect(run?.child.signals).toEqual(['SIGTERM'])
  })

  test('a Tor that opens its port but never bootstraps is used after the timeout', async () => {
    const { spawn, spawned } = fake_tor()
    const tor = create_tor_manager({ tor_path: 'tor', data_dir: await temporary_dir(), log: () => {}, spawn, pick_port: async () => 39051, bootstrap_timeout_ms: 50 })
    const ready = tor.ready()
    await spawned_count(spawned, 1)
    spawned[0]?.child.stdout.write('Opened Socks listener connection (ready) on 127.0.0.1:39051\n')
    expect(await ready).toBe('127.0.0.1:39051')
  })

  test('a Tor that exits before its port opens rejects, and the next call starts a new one', async () => {
    const { spawn, spawned } = fake_tor()
    const tor = create_tor_manager({ tor_path: 'tor', data_dir: await temporary_dir(), log: () => {}, spawn, pick_port: async () => 39052 })
    const ready = tor.ready()
    await spawned_count(spawned, 1)
    spawned[0]?.child.emit('exit', 1, null)
    await expect(ready).rejects.toThrow('Tor exited (code 1) before it was ready.')
    tor.ready().catch(() => {})
    await spawned_count(spawned, 2)
    await tor.stop()
  })
})

describe('bundled network', () => {
  test('public stops Tor and leaves the node its default network; masked hands it the SOCKS address', async () => {
    const calls: string[] = []
    const tor = { ready: async () => { calls.push('ready'); return '127.0.0.1:39050' }, stop: async () => { calls.push('stop') }, kill_now: () => {} }
    let privacy: 'public' | 'masked' = 'public'
    const network = bundled_network({ privacy: () => privacy, tor })
    expect(await network()).toEqual({ privacy: 'public' })
    privacy = 'masked'
    expect(await network()).toEqual({ privacy: 'masked', config: { mode: 'masked', tor: { socks_address: '127.0.0.1:39050' } } })
    expect(calls).toEqual(['stop', 'ready'])
  })

  test('masked without a bundled Tor refuses rather than run the node in the open', async () => {
    await expect(bundled_network({ privacy: () => 'masked', tor: null })()).rejects.toThrow('needs the bundled Tor client')
  })
})
