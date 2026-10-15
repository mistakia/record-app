// The label filter over GET /tags for the shown library: a column of
// facets (label-facets.ts), each a foldable framed section listing its
// labels with their counts. A label toggles in the filter; a track matches
// any label within a facet and every facet selected, and each hand label on
// its own. Counts are the library's, not narrowed by the filter.

import styles from './facet-sidebar.module.css'
import { FramedSection } from '#renderer/components/common/framed-section.tsx'
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
  if (facets.length === 0) return null
  return (
    <aside className={styles.sidebar} aria-label='Filter by label' data-testid='facet-sidebar'>
      {facets.map(({ facet, labels }) => (
        <FramedSection
          key={facet ?? ''}
          title={facet ?? 'Labels'}
          fold_id={`facet:${facet ?? ''}`}
          default_open={labels.length <= OPEN_UP_TO}
          count={labels.length}
          width='full'
        >
          <ul className={styles.labels}>
            {labels.map(({ tag, count }) => (
              <li key={tag}>
                <button type='button' aria-pressed={selected.includes(tag)} className={styles.label} title={tag} onClick={() => { on_toggle(tag) }}>
                  <span className={styles.value}>{label_value(tag)}</span>{' '}
                  <span className={styles.count}>{count}</span>
                </button>
              </li>
            ))}
          </ul>
        </FramedSection>
      ))}
    </aside>
  )
}
