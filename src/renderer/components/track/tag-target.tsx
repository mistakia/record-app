// Where the inline adder's labels go (spec §8.6.3): the identity's labels
// library, `just me`, unless the viewed library is co-managed, where one
// quiet line offers `for just me · shared` and `shared` writes to that
// library. Elsewhere there is no line: a label is always the person's own.
// The rule is label_targets'; the capability is chosen, never asked for.

import { useState } from 'react'

import styles from './tag-editor.module.css'
import { own_libraries_of } from '#renderer/components/library/library-category.ts'
import { label_targets, type WriteTarget } from '#renderer/library/write-targets.ts'
import { use_left_libraries } from '#renderer/library/left-libraries.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_selector } from '#renderer/store/index.ts'

export type LabelScope = 'just_me' | 'shared'

export interface LabelTargetChoice {
  loading: boolean
  scope: LabelScope
  // Null while loading, or when the scope chosen has no target.
  target: WriteTarget | null
  // Whether the viewed library offers `shared`.
  shared: boolean
  choose: (scope: LabelScope) => void
}

export const use_label_target = ({ viewed }: { viewed: string }): LabelTargetChoice => {
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const own = node_api.endpoints.get_own_libraries.useQuery()
  const held = node_api.endpoints.get_held_capabilities.useQuery()
  const viewed_library = libraries.data?.find(({ address }) => address === viewed)
  // An own recordstore is co-managed once it has let someone else write.
  const issued = node_api.endpoints.get_library_capabilities.useQuery(viewed, { skip: viewed_library?.is_own !== true || viewed_library.library_type !== 'recordstore' })
  const node_key = use_app_selector((state) => state.connection.config?.node_key ?? null)
  const left = use_left_libraries(node_key)
  const [scope, set_scope] = useState<LabelScope>('just_me')
  const targets = label_targets({
    own: own_libraries_of({ own: own.data, libraries: libraries.data }),
    libraries: libraries.data ?? [],
    held: held.data ?? [],
    viewed: left.includes(viewed) ? '' : viewed,
    co_managed: (issued.data ?? []).some(({ status }) => status === 'active')
  })
  const loading = libraries.isLoading || own.isLoading || held.isLoading
  return {
    loading,
    scope,
    target: loading ? null : scope === 'shared' ? targets.shared : targets.just_me,
    shared: targets.shared !== null,
    choose: set_scope
  }
}

export const TagTarget = ({ choice, name, on_chosen }: { choice: LabelTargetChoice, name: string, on_chosen: () => void }) => {
  const { scope, shared, choose } = choice
  if (!shared) return null
  const option = (value: LabelScope, label: string) => (
    <button
      type='button'
      data-variant='glyph'
      aria-pressed={scope === value}
      className={scope === value ? styles.library : undefined}
      onClick={() => { choose(value); on_chosen() }}
    >
      {label}
    </button>
  )
  return (
    <p className={styles.target} data-testid='label-scope' data-scope={scope} role='group' aria-label={`Who the label is for in ${name}`}>
      for {option('just_me', 'just me')}{' · '}{option('shared', 'shared')}
    </p>
  )
}
