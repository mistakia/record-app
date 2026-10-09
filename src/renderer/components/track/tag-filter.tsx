// The tag strip over GET /tags for the shown library (STYLE.md § Tag
// chips): every tag with its count, A to Z, on one scrolling line. A chip
// toggles the tag in the filter; selected tags must all match (AND).

import styles from './tag-filter.module.css'
import { node_api } from '#renderer/store/api.ts'

export const TagFilter = ({ library_address, selected, on_toggle }: {
  library_address: string
  selected: readonly string[]
  on_toggle: (tag: string) => void
}) => {
  const tags = node_api.endpoints.get_tags.useQuery(library_address === '' ? {} : { library_addresses: [library_address] })
  const counts = [...(tags.data ?? [])].sort((a, b) => a.tag.localeCompare(b.tag))
  if (counts.length === 0) return null
  return (
    <div className={styles.strip} role='group' aria-label='Filter by tag' data-testid='tag-filter'>
      <div className={styles.chips}>
        {counts.map(({ tag, count }) => (
          <button
            key={tag}
            type='button'
            aria-pressed={selected.includes(tag)}
            className={styles.chip}
            onClick={() => { on_toggle(tag) }}
          >
            {tag} <span className={styles.count}>{count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
