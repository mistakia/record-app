// Write targets (spec §8.6.3, §8.6.7): the libraries a write may go to, and
// what to cite for each. Own active recordstores take a write under the
// owner shortcut (§3.5.4) and cite nothing. A library another identity owns
// is a target only through an active capability this identity holds whose
// actions include the write's; the app picks that capability itself and
// never asks (§8.6.3). Retired libraries, the listens library, and linked
// libraries without a capability are never targets.

import type { Capability, Library } from '#renderer/api/types.ts'

export type WriteAction = 'library.append_track' | 'library.append_tag' | 'library.update_about'

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

export const choose_capability = ({ held, library_address, action }: {
  held: readonly Capability[]
  library_address: string
  action: WriteAction
}): Capability | null => {
  const usable = held.filter((capability) => capability.library_address === library_address && capability.status === 'active' && capability.actions.includes(action))
  usable.sort((a, b) => {
    const [a_filter, a_expiry] = capability_rank(a)
    const [b_filter, b_expiry] = capability_rank(b)
    return a_filter - b_filter || a_expiry - b_expiry
  })
  return usable[0] ?? null
}

export const write_targets = ({ libraries, held, action }: {
  libraries: readonly Library[]
  held: readonly Capability[]
  action: WriteAction
}): WriteTarget[] => {
  const targets: WriteTarget[] = []
  for (const library of libraries) {
    if (library.is_retired || library.library_type !== 'recordstore') continue
    if (library.is_own) {
      targets.push({ library_address: library.address, category: 'own', capability_id: null })
      continue
    }
    const capability = choose_capability({ held, library_address: library.address, action })
    if (capability !== null) targets.push({ library_address: library.address, category: 'shared', capability_id: capability.capability_id })
  }
  return targets
}

// The default target: the preferred address when it is a target (the
// library being viewed, which holds the track being tagged), else the
// library written to last (§8.6.3's recommendation), else the first own one.
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

// The fields a write sends to name its target (chapter 7 WriteTarget).
export const target_fields = (target: WriteTarget): { library_address: string, capability_id?: string } =>
  target.capability_id === null ? { library_address: target.library_address } : { library_address: target.library_address, capability_id: target.capability_id }
