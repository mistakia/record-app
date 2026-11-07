// The label libraries a Tags-page change writes to, and what each holds:
// the labels library, own active recordstores, and shared ones held under
// library.write_label (relabel-run.ts), less any the node manages, which
// show their labels as managed and are never written.

import { useMemo } from 'react'

import type { Capability, Library, TagCount } from '#renderer/api/types.ts'
import { choose_capability, labels_library, type WriteTarget } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { label_batch_api } from '#renderer/store/label-batch.ts'
import { label_write_libraries } from '#renderer/store/relabel-run.ts'

export interface LabelLibraries {
  // Every library the node shows and every own one, to name them.
  known: readonly Library[]
  has_labels_library: boolean
  writable: WriteTarget[]
  held: readonly Capability[]
  // Each writable library's own label counts.
  counts: Readonly<Record<string, TagCount[]>>
  // Labels some writable library holds and its right lets the person
  // change (a shared right may cover only a prefix); null until known.
  writable_labels: ReadonlySet<string> | null
}

const NO_CAPABILITIES: readonly Capability[] = []
const NO_LIBRARIES: readonly Library[] = []

export const use_label_libraries = (): LabelLibraries => {
  const own = node_api.endpoints.get_own_libraries.useQuery().data
  const libraries = node_api.endpoints.get_libraries.useQuery().data
  const held = node_api.endpoints.get_held_capabilities.useQuery().data
  const ready = own !== undefined && libraries !== undefined && held !== undefined
  const targets = useMemo(() => ready ? label_write_libraries({ own, libraries, held }) : [], [ready, own, libraries, held])
  const counts = label_batch_api.endpoints.get_label_library_counts.useQuery(targets.map(({ library_address }) => library_address), { skip: !ready }).data
  return useMemo(() => {
    const data = counts ?? {}
    const writable = targets.filter(({ library_address }) => !(data[library_address] ?? []).some(({ managed }) => managed))
    return {
      known: own === undefined && libraries === undefined ? NO_LIBRARIES : [...own ?? [], ...libraries ?? []],
      has_labels_library: own === undefined || labels_library(own) !== undefined,
      writable,
      held: held ?? NO_CAPABILITIES,
      counts: data,
      writable_labels: counts === undefined
        ? null
        : new Set(writable.flatMap(({ library_address, category }) => (data[library_address] ?? []).flatMap(({ tag }) =>
          category === 'own' || choose_capability({ held: held ?? NO_CAPABILITIES, library_address, action: 'library.write_label', subject: { type: 'label', op: 'unset', track_id: '', label: tag } }) !== null ? [tag] : [])))
    }
  }, [counts, targets, own, libraries, held])
}
