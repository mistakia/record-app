// Identity actions (spec §8.5). Export goes through main's own channel,
// which asks the user in a native dialog before it returns the key, and
// never through RTK Query, so the private key is never held in the store
// (and so never in the hibernation snapshot or any file); the caller keeps
// it in one component's state for the one display, then drops it.

import type { NodeResult } from '#shared/bridge.ts'

export interface ExportedIdentity {
  public_key: string
  private_key: string
}

export const export_identity = async (): Promise<NodeResult<ExportedIdentity>> => await window.record.identity.export()

// Spec §8.5.4: importing replaces the node's identity, so it needs this
// phrase typed out, not just a click.
export const IMPORT_CONFIRMATION_PHRASE = 'replace my identity'

// Why an import cannot go ahead yet, or null when it can.
export const check_import = ({ private_key, confirmation }: { private_key: string, confirmation: string }): string | null => {
  if (confirmation.trim().toLowerCase() !== IMPORT_CONFIRMATION_PHRASE) return `Type "${IMPORT_CONFIRMATION_PHRASE}" to confirm.`
  if (!/^[0-9a-f]+$/i.test(private_key.trim())) return 'The key must be the hex text an export produced.'
  return null
}

// The node returns keys libp2p-marshaled: a protobuf header (key type 2,
// secp256k1; 33 bytes of data) before the key. Spec §8.5.7 shows the
// 66-character compressed key itself, so the header is dropped when present.
const SECP256K1_PUBLIC_KEY_HEADER = '08021221'

export const compressed_public_key = (marshaled: string): string => {
  const key = marshaled.toLowerCase()
  return key.startsWith(SECP256K1_PUBLIC_KEY_HEADER) && /^[0-9a-f]{66}$/.test(key.slice(SECP256K1_PUBLIC_KEY_HEADER.length))
    ? key.slice(SECP256K1_PUBLIC_KEY_HEADER.length)
    : key
}

// Spec §8.5.7: the key inline as its first and last six hex characters.
export const truncate_key = (key: string): string => key.length <= 14 ? key : `${key.slice(0, 6)}…${key.slice(-6)}`

// The last export time per node (by node key; Layer C). A time, never the key.
const export_time_key = (node_key: string): string => `record:last-identity-export:${node_key}`

export const read_last_export = (node_key: string): number | null => {
  const value = Number(window.localStorage.getItem(export_time_key(node_key)))
  return Number.isFinite(value) && value > 0 ? value : null
}

export const record_export = (node_key: string): void => {
  window.localStorage.setItem(export_time_key(node_key), String(Date.now()))
}
