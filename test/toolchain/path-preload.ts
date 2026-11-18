// Test preload: puts the pinned ffmpeg and fpcalc that record-node's
// cli/fetch-toolchain.sh installed first on PATH, for the in-process node and
// the fixtures. record-node is the one home of the pins, at the commit this
// app depends on. It never fetches; when nothing is installed, PATH is left as
// it was and the node's preflight decides.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'

const script = join(import.meta.dir, '../../node_modules/record-node/cli/fetch-toolchain.sh')
const bin_dir = spawnSync('sh', [script, '--print-bin-dir'], { encoding: 'utf8' }).stdout.trim()

if (bin_dir !== '' && existsSync(join(bin_dir, 'ffmpeg')) && existsSync(join(bin_dir, 'fpcalc'))) {
  process.env.PATH = `${bin_dir}${delimiter}${process.env.PATH ?? ''}`
} else if (process.env.RECORD_TOOLCHAIN_PREFLIGHT !== 'bypass') {
  console.warn(`no pinned toolchain at ${bin_dir}; run sh node_modules/record-node/cli/fetch-toolchain.sh (linux x86_64)`)
}
