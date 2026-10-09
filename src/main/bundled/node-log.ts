// The bundled node's stdout and stderr, teed to a rotating log file (spec
// §8.4.4), and the tail of stderr kept for a failed-start report (§8.4.3).
// Imports nothing from Electron.

import { appendFileSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const MAX_LOG_BYTES = 5 * 1024 * 1024
export const KEPT_LOGS = 3
const TAIL_LINES = 40

export const create_node_log = ({ log_dir, file_name = 'node.log', max_bytes = MAX_LOG_BYTES, kept = KEPT_LOGS }: { log_dir: string, file_name?: string, max_bytes?: number, kept?: number }) => {
  const path = join(log_dir, file_name)
  let tail: string[] = []
  mkdirSync(log_dir, { recursive: true })

  const rotate = (): void => {
    rmSync(`${path}.${kept}`, { force: true })
    for (let index = kept - 1; index >= 1; index--) {
      try {
        renameSync(`${path}.${index}`, `${path}.${index + 1}`)
      } catch {}
    }
    try {
      renameSync(path, `${path}.1`)
    } catch {}
  }

  // Synchronous on purpose: lines arrive in order from one child, and a
  // crash should leave everything up to it on disk.
  const append = (stream: 'out' | 'err', text: string): void => {
    let size = 0
    try {
      size = statSync(path).size
    } catch {}
    if (size + text.length > max_bytes) rotate()
    const stamp = new Date().toISOString()
    const lines = text.split('\n').filter((line) => line !== '')
    appendFileSync(path, lines.map((line) => `${stamp} ${stream} ${line}\n`).join(''))
    if (stream === 'err') tail = [...tail, ...lines].slice(-TAIL_LINES)
  }

  return {
    path,
    append,
    stderr_tail: (): string => tail.join('\n'),
    clear_tail: (): void => { tail = [] }
  }
}
