// The label filter over GET /tags for the shown library, whose labels
// count from the person's own libraries and the shown one wherever they
// are held (the node's label_libraries default, spec §8.6.7): a column of
// facets (label-facets.ts), each a foldable framed section listing its
// labels with their counts. A label toggles in the filter; a track matches
// any label within a facet and every facet selected, and each hand label on
// its own. Counts are the view's, not narrowed by the filter. A text
// filter, disclosed on demand, narrows the labels shown: every facet holding
// a match opens, the rest go, and a selected label stays in sight.

import { useState } from 'react'

import styles from './facet-sidebar.module.css'
import { FilterField, FilterToggle } from '#renderer/components/common/filter-field.tsx'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
import { matches_filter } from '#renderer/components/common/text-filter.ts'
import { group_facets, label_value } from '#renderer/store/label-facets.ts'
import { node_api } from '#renderer/store/api.ts'

// A facet this short opens unfolded the first time it is shown.
const OPEN_UP_TO = 12

export const FacetSidebar = ({ library_address, selected, on_toggle }: {
  library_address: string
  selected: readonly string[]
  on_toggle: (label: string) => void
}) => {
  const tags = node_api.endpoints.get_tags.useQuery(library_address === '' ? {} : { library_addresses: [library_address] })
  const facets = group_facets(tags.data ?? [])
  // null while the filter is put away.
  const [query, set_query] = useState<string | null>(null)
  const filtering = query !== null && query.trim() !== ''
  const shown = filtering
    ? facets
      .map(({ facet, labels }) => ({ facet, labels: labels.filter(({ tag }) => selected.includes(tag) || matches_filter(tag, query)) }))
      .filter(({ labels }) => labels.length > 0)
    : facets
  // While a library's labels load the column holds its width, so the list
  // does not jump sideways when they arrive.
  if (tags.isLoading) return <aside className={styles.sidebar} aria-busy='true' />
  if (facets.length === 0) return null
  return (
    <aside className={styles.sidebar} aria-label='Filter by label' data-testid='facet-sidebar'>
      <div className={styles.filter}>
        {query === null
          ? <FilterToggle label='Labels' on_open={() => { set_query('') }} />
          : <FilterField label='Labels' value={query} on_change={set_query} on_dismiss={() => { set_query(null) }} />}
      </div>
      {filtering && shown.length === 0 && <p className={styles.none}>no label matches</p>}
      {shown.map(({ facet, labels }) => {
        // A folded facet still says when it holds part of the filter.
        const chosen = labels.filter(({ tag }) => selected.includes(tag)).length
        return (
          <FramedSection
            key={facet ?? ''}
            title={`${facet ?? 'Labels'}${chosen === 0 ? '' : ` · ${chosen} on`}`}
            fold_id={`facet:${facet ?? ''}`}
            default_open={labels.length <= OPEN_UP_TO}
            force_open={filtering}
            count={labels.length}
            width='full'
          >
            <ul className={styles.labels}>
              {labels.map(({ tag, count }) => (
                <li key={tag}>
                  <button type='button' aria-pressed={selected.includes(tag)} aria-label={`${tag} ${count}`} className={styles.label} title={tag} onClick={() => { on_toggle(tag) }}>
                    <span className={styles.value}>{label_value(tag)}</span>{' '}
                    <span className={styles.count}>{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </FramedSection>
        )
      })}
    </aside>
  )
}
