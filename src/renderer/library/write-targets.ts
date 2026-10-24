// Write targets (spec §8.6.3, §8.6.7): the libraries a write may go to, and
// what to cite for each. Own active recordstores take a write under the
// owner shortcut (§3.5.4) and cite nothing. A library another identity owns
// is a target only through an active capability this identity holds whose
// actions include the write's; the app picks that capability itself and
// never asks (§8.6.3). Retired libraries, the listens library, and linked
// libraries without a capability are never targets. Labels have their own
// rule (label_targets): the identity's labels library by default, and the
// viewed library when it is co-managed.

import type { Capability, Library } from '#renderer/api/types.ts'
import { evaluate_filter } from '#renderer/filter/evaluate-filter.ts'

export type WriteAction = 'library.append_track' | 'library.write_label'

// What a label capability's filter reads for each pair (§3.5.6).
export interface LabelSubject { type: 'label', track_id: string, label: string, op: 'set' | 'unset' }

export interface WriteTarget {
  library_address: string
  category: 'own' | 'shared'
  // Null for an own library.
  capability_id: string | null
}

// Prefer a capability without a filter, then one that never expires, then
// the one that expires last: the least likely to refuse this write.
const capability_rank = (capability: Capability): [number, number] => [
  capability.filter === null ? 0 : 1,
  -(capability.expires_at_ms ?? Number.MAX_SAFE_INTEGER)
]

// Status is the node's view when the list was fetched, so an expiry passed
// since then is checked here too. Given the subject a write's filter reads,
// as a label pair, a filtered capability counts only when its filter holds
// for it (a `prefix` scope, §3.5.7); without one, any filter might.
export const choose_capability = ({ held, library_address, action, subject, now = Date.now() }: {
  held: readonly Capability[]
  library_address: string
  action: WriteAction
  subject?: LabelSubject | undefined
  now?: number
}): Capability | null => {
  const usable = held.filter((capability) => capability.library_address === library_address && capability.status === 'active' &&
    capability.actions.includes(action) && (capability.expires_at_ms === null || capability.expires_at_ms === undefined || capability.expires_at_ms > now) &&
    (subject === undefined || capability.filter === null || evaluate_filter(capability.filter, subject)))
  usable.sort((a, b) => {
    const [a_filter, a_expiry] = capability_rank(a)
    const [b_filter, b_expiry] = capability_rank(b)
    return a_filter - b_filter || a_expiry - b_expiry
  })
  return usable[0] ?? null
}

export const write_targets = ({ libraries, held, action, now = Date.now() }: {
  libraries: readonly Library[]
  held: readonly Capability[]
  action: WriteAction
  now?: number
}): WriteTarget[] => {
  const targets: WriteTarget[] = []
  for (const library of libraries) {
    if (library.is_retired || library.library_type !== 'recordstore') continue
    if (library.is_own) {
      targets.push({ library_address: library.address, category: 'own', capability_id: null })
      continue
    }
    const capability = choose_capability({ held, library_address: library.address, action, now })
    if (capability !== null) targets.push({ library_address: library.address, category: 'shared', capability_id: capability.capability_id })
  }
  return targets
}

// The default target: the preferred address when it is a target (the
// library being viewed), else the library written to last (§8.6.3's
// recommendation), else the first own one.
export const default_target = ({ targets, recent, preferred = null }: {
  targets: readonly WriteTarget[]
  recent: string | null
  preferred?: string | null
}): WriteTarget | null =>
  targets.find(({ library_address }) => library_address === preferred) ??
  targets.find(({ library_address }) => library_address === recent) ??
  targets.find(({ category }) => category === 'own') ??
  targets[0] ??
  null

// The target a write goes to. Nothing until the libraries and capabilities
// have loaded, so a quick write never lands in a default the full list
// would not have chosen; and nothing when the user's own choice is no
// longer a target (its capability revoked or expired, the library
// retired), so a write never silently moves elsewhere (§8.6.7).
export type TargetResolution =
  | { kind: 'loading' }
  | { kind: 'chosen_gone', library_address: string }
  | { kind: 'none' }
  | { kind: 'target', target: WriteTarget }

export const resolve_target = ({ targets, chosen, recent, preferred = null, loading }: {
  targets: readonly WriteTarget[]
  chosen: string | null
  recent: string | null
  preferred?: string | null
  loading: boolean
}): TargetResolution => {
  if (loading) return { kind: 'loading' }
  if (chosen !== null) {
    const target = targets.find(({ library_address }) => library_address === chosen)
    return target === undefined ? { kind: 'chosen_gone', library_address: chosen } : { kind: 'target', target }
  }
  const target = default_target({ targets, recent, preferred })
  return target === null ? { kind: 'none' } : { kind: 'target', target }
}

// The fields a write sends to name its target (chapter 7 WriteTarget).
export const target_fields = (target: WriteTarget): { library_address: string, capability_id?: string } =>
  target.capability_id === null ? { library_address: target.library_address } : { library_address: target.library_address, capability_id: target.capability_id }

// The identity's active labels library (§4.9): where its own labels live.
export const labels_library = (own: readonly Library[]): Library | undefined =>
  own.find(({ is_own, is_retired, library_type }) => is_own && !is_retired && library_type === 'labels')

// Where a label goes (§8.6.3): `just me` is the labels library, the default,
// so the label is the person's own in every view. Inside a co-managed
// library, `shared` writes to that library instead: one another identity
// owns whose capability grants library.write_label, or an own recordstore
// that has issued an active capability to someone (`co_managed`).
export interface LabelTargets {
  just_me: WriteTarget | null
  shared: WriteTarget | null
}

export const label_targets = ({ own, libraries, held, viewed, co_managed, now = Date.now() }: {
  own: readonly Library[]
  libraries: readonly Library[]
  held: readonly Capability[]
  // The library the list shows; '' for the aggregated view.
  viewed: string
  co_managed: boolean
  now?: number
}): LabelTargets => {
  const labels = labels_library(own)
  const just_me: WriteTarget | null = labels === undefined ? null : { library_address: labels.address, category: 'own', capability_id: null }
  const library = viewed === '' ? undefined : libraries.find(({ address }) => address === viewed)
  if (library === undefined || library.is_retired || library.library_type !== 'recordstore') return { just_me, shared: null }
  if (library.is_own) return { just_me, shared: co_managed ? { library_address: library.address, category: 'own', capability_id: null } : null }
  const capability = choose_capability({ held, library_address: library.address, action: 'library.write_label', now })
  return { just_me, shared: capability === null ? null : { library_address: library.address, category: 'shared', capability_id: capability.capability_id } }
}

// The target a label write to `target` cites for this pair: the target
// itself for an own library, and for a shared one the capability whose
// filter admits the pair; null when none does.
export const label_write_target = ({ target, held, subject, now = Date.now() }: {
  target: WriteTarget
  held: readonly Capability[]
  subject: LabelSubject
  now?: number
}): WriteTarget | null => {
  if (target.capability_id === null) return target
  const capability = choose_capability({ held, library_address: target.library_address, action: 'library.write_label', subject, now })
  return capability === null ? null : { ...target, capability_id: capability.capability_id }
}

// Where a label shown on a track can be removed from (§8.6.3): the library
// applying it, when it is an own active recordstore or labels library, or a
// shared one whose capability admits unsetting the pair. A label a
// node-managed library holds (TagCount.managed) is read-only outside the
// labels library, which a node never manages.
export const removal_target = ({ library_address, tag, track_id, libraries, own, held, managed, now = Date.now() }: {
  library_address: string
  tag: string
  track_id: string
  libraries: readonly Library[]
  own: readonly Library[]
  held: readonly Capability[]
  managed: ReadonlySet<string>
  now?: number
}): WriteTarget | null => {
  const library = own.find(({ address }) => address === library_address) ?? libraries.find(({ address }) => address === library_address)
  if (library === undefined || library.is_retired) return null
  if (library.library_type === 'labels') return library.is_own ? { library_address, category: 'own', capability_id: null } : null
  if (library.library_type !== 'recordstore' || managed.has(tag)) return null
  if (library.is_own) return { library_address, category: 'own', capability_id: null }
  return label_write_target({ target: { library_address, category: 'shared', capability_id: '' }, held, subject: { type: 'label', track_id, label: tag, op: 'unset' }, now })
}
