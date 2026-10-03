// The write-target selector (spec §8.6.3, §8.6.7). A write that could go to
// more than one library shows a selector, defaulting to the library being
// viewed or the one written to last; with a single target it names it, so
// the user always sees where a write lands. The capability for a shared
// target is chosen here, never asked for. A node without
// /identity/capabilities (404) simply offers no shared targets (§8.7.6).

import { useState } from 'react'

import styles from './target-select.module.css'
import { library_name } from './library-category.ts'
import { resolve_target, write_targets, type TargetResolution, type WriteAction, type WriteTarget } from '#renderer/library/write-targets.ts'
import { use_left_libraries } from '#renderer/library/left-libraries.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { write_target_used } from '#renderer/store/ui.ts'

export interface WriteTargetChoice {
  targets: WriteTarget[]
  resolution: TargetResolution
  // Null while loading, when there is none, or when the chosen one is gone.
  target: WriteTarget | null
  choose: (library_address: string) => void
  // Call after a write succeeds, so the next write defaults to the same library.
  used: (target: WriteTarget) => void
  name_of: (library_address: string) => string
}

export const use_write_target = ({ action, preferred = [], exclude = [] }: {
  action: WriteAction
  preferred?: readonly string[]
  exclude?: readonly string[]
}): WriteTargetChoice => {
  const dispatch = use_app_dispatch()
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const held = node_api.endpoints.get_held_capabilities.useQuery()
  const recent = use_app_selector((state) => state.ui.recent_write_target)
  const [chosen, set_chosen] = useState<string | null>(null)
  // Shared libraries the user left are not offered (§8.6.4).
  const node_key = use_app_selector((state) => state.connection.config?.node_key ?? null)
  const left = use_left_libraries(node_key)
  const targets = write_targets({ libraries: libraries.data ?? [], held: held.data ?? [], action })
    .filter(({ library_address, category }) => !exclude.includes(library_address) && !(category === 'shared' && left.includes(library_address)))
  // A 404 from an older node settles the capability list as empty (§8.7.6).
  const loading = libraries.isLoading || held.isLoading
  const resolution = resolve_target({ targets, chosen, recent, preferred, loading })
  const target = resolution.kind === 'target' ? resolution.target : null
  const name_of = (library_address: string): string => {
    const library = libraries.data?.find(({ address }) => address === library_address)
    return library === undefined ? library_address : library_name(library)
  }
  return {
    targets,
    resolution,
    target,
    choose: set_chosen,
    used: (used_target) => { dispatch(write_target_used(used_target.library_address)) },
    name_of
  }
}

export const TargetSelect = ({ choice, label = 'Into' }: { choice: WriteTargetChoice, label?: string }) => {
  const { targets, target, resolution, choose, name_of } = choice
  if (resolution.kind === 'loading') return <span className={styles.none} data-testid='write-target'>Finding the libraries you can write to.</span>
  if (targets.length === 0) return <span className={styles.none} data-testid='write-target'>No library you can write to.</span>
  const describe = (candidate: WriteTarget): string => `${name_of(candidate.library_address)}${candidate.category === 'shared' ? ' (shared)' : ''}`
  if (targets.length === 1 && target !== null) return <span className={styles.single} data-testid='write-target'>{label} {describe(target)}</span>
  return (
    <label className={styles.select}>
      {label}
      <select aria-label='Target library' data-testid='write-target' value={target?.library_address ?? ''} onChange={(event) => { choose(event.target.value) }}>
        {target === null && <option value=''>Choose a library</option>}
        {targets.map((candidate) => <option key={candidate.library_address} value={candidate.library_address}>{describe(candidate)}</option>)}
      </select>
      {resolution.kind === 'chosen_gone' && (
        <span className={styles.gone} role='alert'>You can no longer write to {name_of(resolution.library_address)}. Choose another library.</span>
      )}
    </label>
  )
}
