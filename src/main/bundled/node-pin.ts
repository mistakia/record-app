// Which node and identity the bundled data directory holds, recorded on its
// first healthy start: the libp2p peer_id, which a later health check must
// match (so another process on the port cannot pass for the node), and the
// own library address, which follows the identity key. Together they name
// the node for per-node state, so a reset data directory or an imported
// identity starts that state clean. Kept in the data directory, so it goes
// with it. Imports nothing from Electron.

import { readFileSync } from 'node:fs'
import { rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const PIN_FILE = 'record-app-node.json'

export interface NodePin {
  peer_id: string
  own_library_address: string | null
}

export const read_pin = (data_dir: string): NodePin | null => {
  try {
    const pin = JSON.parse(readFileSync(join(data_dir, PIN_FILE), 'utf8')) as Partial<NodePin>
    if (typeof pin.peer_id !== 'string') return null
    return { peer_id: pin.peer_id, own_library_address: typeof pin.own_library_address === 'string' ? pin.own_library_address : null }
  } catch {
    return null
  }
}

export const write_pin = async (data_dir: string, pin: NodePin): Promise<void> => {
  const path = join(data_dir, PIN_FILE)
  await writeFile(`${path}.tmp`, `${JSON.stringify(pin)}\n`, { mode: 0o600 })
  await rename(`${path}.tmp`, path)
}

export const bundled_node_key = (pin: NodePin | null): string | null =>
  pin === null ? null : `bundled:${pin.peer_id}:${pin.own_library_address ?? ''}`
