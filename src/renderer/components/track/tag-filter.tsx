// The tag filter over GET /tags for the shown library: selected tags must
// all match (AND), as the API defines.

import styles from './tag-filter.module.css'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { tag_toggled } from '#renderer/store/ui.ts'

const VISIBLE_TAGS = 40

export const TagFilter = ({ library_address }: { library_address: string }) => {
  const dispatch = use_app_dispatch()
  const selected = use_app_selector((state) => state.ui.filters.tags)
  const tags = node_api.endpoints.get_tags.useQuery(library_address === '' ? {} : { library_addresses: [library_address] })
  const counts = [...(tags.data ?? [])].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  // Selected tags stay visible even when they fall outside the top list.
  const shown = [...counts.slice(0, VISIBLE_TAGS), ...counts.slice(VISIBLE_TAGS).filter(({ tag }) => selected.includes(tag))]

  if (counts.length === 0) return <p className={styles.empty} data-testid='tag-filter'>No tags in this view.</p>
  return (
    <div className={styles.filter} role='group' aria-label='Filter by tag' data-testid='tag-filter'>
      {shown.map(({ tag, count }) => (
        <button
          key={tag}
          type='button'
          aria-pressed={selected.includes(tag)}
          className={selected.includes(tag) ? `${styles.tag} ${styles.on}` : styles.tag}
          onClick={() => { dispatch(tag_toggled(tag)) }}
        >
          {tag} <span className={styles.count}>{count}</span>
        </button>
      ))}
      {counts.length > shown.length && <span className={styles.more}>{counts.length - shown.length} more</span>}
    </div>
  )
}
