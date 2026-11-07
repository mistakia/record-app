// The Tags page (STYLE.md § Tags page): every label with its count, by
// facet, for exploring where a label lives and reorganizing labels in bulk.
// The scope narrows what it lists; a rename, merge, facet move or delete
// applies to the person's labels in every library they can write labels
// to, through the relabel job. Labels the node manages are read-only.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import styles from './tags.module.css'
import type { TagCount } from '#renderer/api/types.ts'
import { EmptyState } from '#renderer/components/common/empty-state.tsx'
import { matches_filter } from '#renderer/components/common/text-filter.ts'
import { library_name, library_name_at } from '#renderer/components/library/library-category.ts'
import { RelabelDialog } from '#renderer/components/tags/relabel-dialog.tsx'
import { TagCollisionSection } from '#renderer/components/tags/tag-collision-section.tsx'
import { tag_collisions, type TagCollision } from '#renderer/components/tags/tag-collisions.ts'
import { TagIndex } from '#renderer/components/tags/tag-index.tsx'
import { tag_index_rows, type RelabelRequest, type TagIndexRow, type TagSort } from '#renderer/components/tags/tag-index-rows.ts'
import { TagInspector } from '#renderer/components/tags/tag-inspector.tsx'
import { use_label_libraries } from '#renderer/components/tags/use-label-libraries.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import { use_inspector_fit } from '#renderer/components/track/use-inspector-fit.ts'
import { SEARCH_INPUT_ID } from '#renderer/hooks/use-hotkeys.ts'
import { use_view_pref } from '#renderer/prefs/view-prefs.ts'
import { parse_tags_scope, ROUTES, tags_route, tracks_route } from '#renderer/routes.ts'
import { DEFAULT_TRACK_FILTERS, node_api } from '#renderer/store/api.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'

const NO_OPENED: readonly string[] = []
// STYLE.md § Tags page: from this body width the details sit in a side
// column that takes the room the index leaves, with the near duplicates.
const SIDE_COLUMN_FROM = 960
const NO_COUNTS: readonly TagCount[] = []

export const Tags = () => {
  const navigate = useNavigate()
  const dispatch = use_app_dispatch()
  const { search } = useLocation()
  const scope = parse_tags_scope(new URLSearchParams(search))
  const label_libraries = use_label_libraries()
  const scopes = [...new Map(label_libraries.known.filter(({ library_type, is_retired }) => library_type === 'recordstore' && !is_retired).map((library) => [library.address, library])).values()]
  const scoped_tags = node_api.endpoints.get_tags.useQuery(scope === '' ? {} : { library_addresses: [scope] })
  const all_tags = node_api.endpoints.get_tags.useQuery({})
  const counts = scoped_tags.data ?? NO_COUNTS
  const every_count = all_tags.data ?? NO_COUNTS

  const [filter, set_filter] = useState('')
  const [sort, set_sort] = use_view_pref<TagSort>('tags-sort', 'count')
  // Facets open folded until opened, and an opened one stays open.
  const [opens, set_opens] = use_view_pref<readonly string[]>('tags-opened', NO_OPENED)
  const opened = useMemo(() => new Set(opens), [opens])
  const rows = useMemo(() => tag_index_rows({ counts, filter, sort, opened, writable: label_libraries.writable_labels }),
    [counts, filter, sort, opened, label_libraries.writable_labels])
  // The scope and the filter narrow the near duplicates as they do the index.
  const collisions = useMemo(() => tag_collisions(counts).filter(({ members }) => members.some(({ tag }) => matches_filter(tag, filter))), [counts, filter])
  const shown_labels = rows.filter(({ kind }) => kind === 'label').length

  // The details open with the page; `i` closes and reopens them.
  const [inspecting, set_inspecting] = useState(true)
  const [wide, set_wide] = useState(false)
  const [cursor_row, set_cursor_row] = useState<TagIndexRow | null>(null)
  const [dialog, set_dialog] = useState<{ request: RelabelRequest, initial_name: string } | null>(null)
  const body_ref = useRef<HTMLDivElement>(null)
  use_inspector_fit({ body: body_ref, open: inspecting, close: () => { set_inspecting(false) } })
  useEffect(() => {
    const element = body_ref.current
    if (element === null) return
    const observer = new ResizeObserver(([entry]) => { if (entry !== undefined) set_wide(entry.contentRect.width >= SIDE_COLUMN_FROM) })
    observer.observe(element)
    return () => { observer.disconnect() }
  })
  const side = wide && inspecting

  const open_label = useCallback((label: string) => {
    navigate(tracks_route({ library_address: scope, filters: { ...DEFAULT_TRACK_FILTERS, tags: [label] } }))
  }, [navigate, scope])
  const refuse = useCallback((message: string) => { dispatch(notified({ kind: 'info', title: 'cannot change', message, key: 'tags-refusal' })) }, [dispatch])
  const request = useCallback((next: RelabelRequest) => { set_dialog({ request: next, initial_name: next.kind === 'rename' && next.labels.length === 1 ? next.labels[0]! : '' }) }, [])
  const fold = useCallback((key: string) => {
    set_opens(opens.includes(key) ? opens.filter((each) => each !== key) : [...opens, key])
  }, [opens, set_opens])
  const merge = (collision: TagCollision): void => {
    const [target, ...rest] = collision.members
    set_dialog({ request: { kind: 'rename', labels: rest.map(({ tag }) => tag), left_out: [] }, initial_name: target!.tag })
  }

  const loading = scoped_tags.data === undefined && scoped_tags.isFetching
  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <select aria-label='Scope' value={scope} onChange={(event) => { navigate(tags_route({ library_address: event.target.value })) }} data-testid='tags-scope'>
          <option value=''>All libraries</option>
          {scopes.map((library) => <option key={library.address} value={library.address}>{library_name(library)}</option>)}
        </select>
        <input
          id={SEARCH_INPUT_ID}
          type='text'
          className={styles.filter}
          placeholder='filter labels'
          aria-label='Filter labels'
          data-testid='tags-filter'
          spellCheck={false}
          autoComplete='off'
          value={filter}
          onChange={(event) => { set_filter(event.target.value) }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== 'ArrowDown') return
            event.preventDefault()
            list_commands()?.focus()
          }}
        />
        <span className={styles.count} data-testid='tags-total'>{filter.trim() === '' ? `${counts.length} labels` : `${shown_labels} of ${counts.length} labels`}</span>
        <button type='button' data-variant='glyph' className={styles.sort} onClick={() => { set_sort(sort === 'count' ? 'name' : 'count') }} aria-label={`Sorted by ${sort}; sort by ${sort === 'count' ? 'name' : 'count'}`}>
          by {sort}
        </button>
      </div>
      {!label_libraries.has_labels_library && <p className={styles.note}>Your identity has no labels library, so labels can be explored here but not changed.</p>}
      {scoped_tags.error !== undefined && <p className={styles.error}>!! {'message' in scoped_tags.error ? scoped_tags.error.message : 'The node request failed.'}</p>}
      {!side && <TagCollisionSection collisions={collisions} on_merge={merge} />}
      {rows.length === 0 && filter.trim() !== '' && <p className={styles.note}>No label matches.</p>}
      {!loading && counts.length === 0
        ? scope === ''
          ? <EmptyState headline='No labels' detail='Label a track with t on any track list; its labels gather here by facet.' action={<button type='button' data-variant='primary' onClick={() => { navigate(ROUTES.tracks) }}>Open tracks</button>} testid='tags-empty' />
          : <EmptyState headline='No labels here' detail={`No track in ${library_name_at(scope, label_libraries.known)} carries a label.`} action={<button type='button' data-variant='primary' onClick={() => { navigate(tags_route()) }}>All libraries</button>} testid='tags-empty' />
        : (
          <div ref={body_ref} className={styles.body}>
            <TagIndex
              rows={rows}
              counts={every_count}
              on_open={open_label}
              on_fold={fold}
              on_request={request}
              on_refuse={refuse}
              on_toggle_inspector={() => { set_inspecting((open) => !open) }}
              on_cursor={set_cursor_row}
            />
            {inspecting && (
              <div className={side ? styles.side : styles.pane}>
                {side && <TagCollisionSection collisions={collisions} on_merge={merge} />}
                <TagInspector
                  row={cursor_row}
                  counts={counts}
                  scope={scope}
                  label_libraries={label_libraries}
                  on_rename={() => { list_commands()?.rename_labels?.() }}
                  on_delete={() => { list_commands()?.delete_labels?.() }}
                  on_open={open_label}
                  on_close={() => { set_inspecting(false) }}
                />
              </div>
            )}
          </div>
          )}
      {dialog !== null && (
        <RelabelDialog
          request={dialog.request}
          initial_name={dialog.initial_name}
          counts={every_count}
          label_libraries={label_libraries}
          scoped={scope !== ''}
          on_close={() => { set_dialog(null) }}
        />
      )}
    </section>
  )
}
