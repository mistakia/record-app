// The bundled Tor client for the masked network privacy (spec §8.2.6,
// §8.3.5): a child of main with its data directory under userData and its
// SOCKS5 port on loopback, started only while the setting is masked. `ready`
// resolves with the SOCKS address once the port accepts connections and Tor
// has bootstrapped, or once bootstrap_timeout_ms passes with the port open,
// since a node held back past that would only sit idle: it retries its dials
// itself. Tor exits with the app even on a crash (__OwningControllerProcess).

import { spawn as node_spawn, type ChildProcess } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { choose_port } from './node-manager.ts'

const SOCKS_OPENED = /Opened Socks listener connection \(ready\) on 127\.0\.0\.1:(\d+)/
const BOOTSTRAPPED = /Bootstrapped 100%/
const TAIL_BYTES = 4_000

export type SpawnTor = (command: string, args: string[]) => Pick<ChildProcess, 'stdout' | 'stderr' | 'on' | 'kill' | 'exitCode' | 'pid'>

export interface TorManager {
  // The SOCKS5 address, starting Tor if it is not running.
  ready: () => Promise<string>
  stop: () => Promise<void>
  // Synchronous, for process exit.
  kill_now: () => void
}

export const tor_arguments = ({ data_dir, socks_port, torrc_path, owner_pid }: {
  data_dir: string
  socks_port: number
  torrc_path: string
  owner_pid: number
}): string[] => [
  // An empty torrc of our own, so no system torrc is read.
  '-f', torrc_path, '--defaults-torrc', torrc_path,
  '--DataDirectory', data_dir,
  '--SocksPort', `127.0.0.1:${socks_port}`,
  '--ClientOnly', '1',
  '--AvoidDiskWrites', '1',
  '--Log', 'notice stdout',
  '--__OwningControllerProcess', String(owner_pid)
]

export const create_tor_manager = ({
  tor_path, data_dir, log,
  spawn = (command, args) => node_spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }),
  pick_port = choose_port,
  owner_pid = process.pid,
  bootstrap_timeout_ms = 90_000,
  stop_timeout_ms = 5_000
}: {
  tor_path: string
  data_dir: string
  log: (stream: 'out' | 'err', text: string) => void
  spawn?: SpawnTor
  pick_port?: (preferred: number | null) => Promise<number>
  owner_pid?: number
  bootstrap_timeout_ms?: number
  stop_timeout_ms?: number
}): TorManager => {
  let child: ReturnType<SpawnTor> | null = null
  let starting: Promise<string> | null = null

  const start = async (): Promise<string> => {
    // Tor refuses a data directory others can read.
    await mkdir(data_dir, { recursive: true, mode: 0o700 })
    const torrc_path = join(data_dir, 'torrc')
    await writeFile(torrc_path, '', { mode: 0o600 })
    const socks_port = await pick_port(null)
    const current = spawn(tor_path, tor_arguments({ data_dir, socks_port, torrc_path, owner_pid }))
    child = current
    return await new Promise<string>((resolve, reject) => {
      let tail = ''
      let socks_address: string | null = null
      let settled = false
      const settle = (outcome: () => void) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        outcome()
      }
      const timer = setTimeout(() => {
        if (socks_address !== null) settle(() => { resolve(socks_address as string) })
        else settle(() => { reject(new Error(`Tor did not open its SOCKS port within ${bootstrap_timeout_ms / 1000} s.`)) })
      }, bootstrap_timeout_ms)
      current.stdout?.on('data', (data: Buffer) => {
        const text = String(data)
        log('out', text)
        tail = (tail + text).slice(-TAIL_BYTES)
        const opened = SOCKS_OPENED.exec(tail)
        if (opened !== null) socks_address = `127.0.0.1:${opened[1] as string}`
        if (socks_address !== null && BOOTSTRAPPED.test(tail)) settle(() => { resolve(socks_address as string) })
      })
      current.stderr?.on('data', (data: Buffer) => { log('err', String(data)) })
      current.on('exit', (code, signal) => {
        if (child === current) child = null
        starting = null
        settle(() => { reject(new Error(`Tor exited (${signal ?? `code ${String(code)}`}) before it was ready.`)) })
      })
      current.on('error', (error) => {
        if (child === current) child = null
        starting = null
        settle(() => { reject(error) })
      })
    })
  }

  return {
    ready: async () => {
      starting ??= start()
      try {
        return await starting
      } catch (error) {
        starting = null
        throw error
      }
    },
    stop: async () => {
      const current = child
      child = null
      starting = null
      if (current === null || current.exitCode !== null) return
      const exited = new Promise<void>((resolve) => { current.on('exit', () => { resolve() }) })
      current.kill('SIGTERM')
      const timer = setTimeout(() => { current.kill('SIGKILL') }, stop_timeout_ms)
      await exited
      clearTimeout(timer)
    },
    kill_now: () => {
      child?.kill('SIGKILL')
      child = null
    }
  }
}
