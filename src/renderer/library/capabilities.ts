// Plain-text descriptions of capabilities (spec §3.5.5–§3.5.8, §8.6.4). An
// action verb, GranteeSpec, or ConditionSpec type this version does not know
// is shown as an opaque label, never hidden or reinterpreted.

import type { Capability } from '#renderer/api/types.ts'
import { describe_filter } from '#renderer/filter/filter-spec.ts'

export const ISSUABLE_ACTIONS = [
  { verb: 'library.append_track', label: 'Add tracks' },
  { verb: 'library.append_tag', label: 'Add tags' },
  { verb: 'library.update_about', label: 'Edit the profile' },
  { verb: 'library.grant_capability', label: 'Grant capabilities to others' }
] as const

const ACTION_LABELS: Record<string, string> = Object.fromEntries(ISSUABLE_ACTIONS.map(({ verb, label }) => [verb, label]))

export const describe_action = (verb: string): string => ACTION_LABELS[verb] ?? `(unknown action: ${verb})`

export const short_key = (key: string): string => key.length > 16 ? `${key.slice(0, 8)}…${key.slice(-6)}` : key

export const describe_grantee = (grantee: unknown): string => {
  const { type, key, keys } = (typeof grantee === 'object' && grantee !== null ? grantee : {}) as { type?: unknown, key?: unknown, keys?: unknown }
  if (type === 'key' && typeof key === 'string') return short_key(key)
  if (type === 'key_set' && Array.isArray(keys)) return `${keys.length} identities: ${keys.map((each) => short_key(String(each))).join(', ')}`
  return `(unknown grantee: ${String(type)})`
}

export const describe_conditions = (conditions: readonly unknown[]): string[] => conditions.map((condition) => {
  const { type, at } = (typeof condition === 'object' && condition !== null ? condition : {}) as { type?: unknown, at?: unknown }
  if (type === 'expires_at' && typeof at === 'number') return `expires ${new Date(at).toLocaleString()}`
  return `(unknown condition: ${String(type)})`
})

// What a held or issued capability permits, in one line (spec §8.6.1: the
// scope of a shared library's held capabilities).
export const describe_scope = (capability: Pick<Capability, 'actions' | 'filter' | 'conditions'>): string => [
  capability.actions.map(describe_action).join(', '),
  capability.filter === null ? null : `only ${describe_filter(capability.filter)}`,
  ...describe_conditions(capability.conditions)
].filter((part) => part !== null).join('; ')

// A compressed secp256k1 public key (spec §3.1).
export const PUBLIC_KEY = /^0[23][0-9a-f]{64}$/

// The grantee keys typed into the issue form, one per line or comma.
export const parse_grantee_keys = (text: string): { ok: true, grantee: { type: 'key', key: string } | { type: 'key_set', keys: string[] } } | { ok: false, reason: string } => {
  const keys = [...new Set(text.split(/[\s,]+/).map((key) => key.trim().toLowerCase()).filter((key) => key !== ''))]
  if (keys.length === 0) return { ok: false, reason: 'Enter the public key of the identity to grant.' }
  const bad = keys.find((key) => !PUBLIC_KEY.test(key))
  if (bad !== undefined) return { ok: false, reason: `Not a compressed public key (66 hex characters starting 02 or 03): ${short_key(bad)}` }
  const [only] = keys
  return keys.length === 1 && only !== undefined ? { ok: true, grantee: { type: 'key', key: only } } : { ok: true, grantee: { type: 'key_set', keys } }
}
