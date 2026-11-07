// The Tags page's details pane (STYLE.md § Tags page › Inspector): the
// cursor label's count in the page's scope and in each library you can
// write labels to, whether the node manages it, its newest tracks, and its
// actions. On a facet header it shows the facet's totals and each label's
// share of its uses.

import { skipToken } from '@reduxjs/toolkit/query/react'

import own from './tag-inspector.module.css'
import { shown_label, type TagIndexRow } from './tag-index-rows.ts'
import type { LabelLibraries } from './use-label-libraries.ts'
import type { TagCount } from '#renderer/api/types.ts'
import { library_name_at } from '#renderer/components/library/library-category.ts'
import styles from '#renderer/components/track/inspector.module.css'
import { node_api } from '#renderer/store/api.ts'
import { label_facet, label_filter_args, label_value } from '#renderer/store/label-facets.ts'

const NEWEST = 6
const SHARES = 12

export const TagInspector = ({ row, counts, scope, label_libraries, on_rename, on_delete, on_open, on_close }: {
  row: TagIndexRow | null
  // The page's labels in its scope, for a facet's shares.
  counts: readonly TagCount[]
  // The scope's library, or '' for every library.
  scope: string
  label_libraries: LabelLibraries
  on_rename: () => void
  on_delete: () => void
  on_open: (label: string) => void
  on_close: () => void
}) => {
  // A facet is read-only when every label in it is managed.
  const managed = row?.managed === true
  const newest = node_api.endpoints.get_tracks.useQuery(row?.kind === 'label'
    ? { offset: 0, limit: NEWEST, ...(scope === '' ? {} : { library_addresses: [scope] }), ...label_filter_args([row.tag]) }
    : skipToken)
  const facet_labels = row?.kind === 'facet'
    ? counts.filter(({ tag }) => label_facet(tag) === row.facet).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    : []
  const most = facet_labels[0]?.count ?? 0
  return (
    <aside className={styles.pane} aria-label='Label details' data-testid='tag-inspector'>
      <header className={styles.head}>
        <span className={styles.kicker}>{row?.kind === 'facet' ? 'Facet' : 'Label'}</span>
        <button type='button' data-variant='glyph' onClick={on_close}>[x]</button>
      </header>
      {row === null
        ? <p className={styles.empty}>No label under the cursor.</p>
        : (
          <div className={styles.body}>
            <div className={styles.title}>{row.kind === 'facet' ? row.facet ?? 'Hand labels' : row.tag}</div>
            <dl className={styles.fields}>
              {row.kind === 'facet'
                ? (
                  <>
                    <dt>Labels</dt><dd>{row.label_count}</dd>
                    <dt>Uses</dt><dd>{row.total}</dd>
                    {managed && <><dt>Managed</dt><dd>every label, read-only</dd></>}
                  </>
                  )
                : (
                  <>
                    <dt>Tracks</dt><dd>{row.count} shown here</dd>
                    {label_libraries.writable.map(({ library_address }) => {
                      const count = (label_libraries.counts[library_address] ?? []).find(({ tag }) => tag === row.tag)?.count ?? 0
                      return count === 0 ? null : <div key={library_address} style={{ display: 'contents' }}><dt>In {library_name_at(library_address, label_libraries.known)}</dt><dd>{count} {count === 1 ? 'track' : 'tracks'}</dd></div>
                    })}
                    {managed && <><dt>Managed</dt><dd>read-only</dd></>}
                    {!managed && row.not_writable && <><dt>Held</dt><dd>only in libraries you cannot write</dd></>}
                  </>
                  )}
            </dl>
            {row.kind === 'label' && (newest.data?.items.length ?? 0) > 0 && (
              <section className={own.section} aria-label='Newest tracks'>
                <h3 className={own.kicker}>Newest tracks</h3>
                <ol className={own.tracks}>
                  {newest.data!.items.map((track) => (
                    <li key={track.id}>
                      <span className={own.title}>{track.title ?? 'Untitled'}</span>
                      {track.artist != null && <span className={own.artist}>{track.artist}</span>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {facet_labels.length > 0 && (
              <section className={own.section} aria-label='Uses by label'>
                <h3 className={own.kicker}>Uses by label</h3>
                <ol className={own.shares}>
                  {facet_labels.slice(0, SHARES).map(({ tag, count }) => (
                    <li key={tag}>
                      <span className={own.name} title={tag}>{shown_label(label_value(tag))}</span>
                      <span className={own.bar} aria-hidden='true'><span style={{ width: `${(count / most) * 100}%` }} /></span>
                      <span className={own.count}>{count}</span>
                    </li>
                  ))}
                </ol>
                {facet_labels.length > SHARES && <p className={own.more}>and {facet_labels.length - SHARES} more</p>}
              </section>
            )}
            <div className={styles.row}>
              {row.kind === 'label' && <button type='button' data-size='small' onClick={() => { on_open(row.tag) }}>Open in Tracks</button>}
              {!managed && <button type='button' data-size='small' onClick={on_rename}>Rename</button>}
              {!managed && <button type='button' data-size='small' onClick={on_delete}>Delete</button>}
            </div>
          </div>
          )}
    </aside>
  )
}
