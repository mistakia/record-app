// The virtualized track list (spec §8.11.2, STYLE.md § Components › Track
// list): one positioned row per visible index of the whole result, with the
// 200-row pages under the visible rows subscribed and every other page
// released. It owns the cursor and selection (store/list-cursor.ts) and
// answers the list hotkeys while it is mounted.

import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
import { shallowEqual, useStore } from 'react-redux'

import styles from './track-list.module.css'
import { COLUMNS, fit_column_width, grid_min_width, grid_template, NO_COLUMN_WIDTHS, NO_HIDDEN_COLUMNS, visible_columns, type ColumnId, type ColumnWidths } from './columns.ts'
import { register_list_commands } from './list-commands.ts'
import { PageSubscription, select_list_page, type ListSource } from './list-source.ts'
import { pages_for_rows, row_location } from './track-pages.ts'
import { TrackRow, TrackRowSkeleton, type RowHandlers, type RowPlayState } from './track-row.tsx'
import { use_label_removal } from './use-label-removal.ts'
import type { Track } from '#renderer/api/types.ts'
import { ContextMenu, type MenuItem } from '#renderer/components/common/context-menu.tsx'
import { tip } from '#renderer/components/common/tooltip-logic.ts'
import { is_field } from '#renderer/hooks/hotkeys.ts'
import { use_view_pref } from '#renderer/prefs/view-prefs.ts'
import type { SortOrder, TrackSort } from '#renderer/store/api.ts'
import { use_app_dispatch, use_app_selector, type RootState } from '#renderer/store/index.ts'
import { action_rows, cursor_moved, row_clicked, selection_cleared, selection_toggled, view_entered } from '#renderer/store/list-cursor.ts'

const ROW_HEIGHT = 36
// A column's narrowest and widest a drag or a key step can hold it, and the
// keyboard step (Shift makes it four). Home on the handle restores the
// column's default width.
const COLUMN_MIN_PX = 48
const COLUMN_MAX_PX = 720
const COLUMN_STEP_PX = 8
// How long the viewport must rest on a set of pages before they are
// fetched, when it moved on from the last set sooner than that. A fling
// across a large library passes pages it never stops on; a node answers
// page requests one at a time, so each one asked for on the way would hold
// up the page the list lands on.
const SETTLE_MS = 150

// The pages to subscribe: a new view's at once, a change after a rest at
// once, and a change hard on another only once it has held for SETTLE_MS.
// Pages already cached show meanwhile.
const use_settled_pages = (pages: number[], view_key: string): number[] => {
  const key = pages.join(',')
  const [settled, set_settled] = useState({ view_key, key })
  const changed_at = useRef(0)
  const current = settled.view_key === view_key ? settled.key : key
  useEffect(() => {
    if (settled.view_key === view_key && settled.key === key) return
    const now = performance.now()
    const resting = now - changed_at.current >= SETTLE_MS
    changed_at.current = now
    if (settled.view_key !== view_key || resting) {
      set_settled({ view_key, key })
      return
    }
    const timer = setTimeout(() => { set_settled({ view_key, key }) }, SETTLE_MS)
    return () => { clearTimeout(timer) }
  }, [key, view_key, settled])
  return useMemo(() => current.split(',').map(Number), [current])
}

export interface ListActions {
  // The row's loaded page, to queue from, and where in it the row sits.
  play: (input: { page_tracks: Track[], index: number }) => void
  queue: (input: { tracks: Track[], at: 'next' | 'end' }) => void
  adopt: (tracks: Track[]) => void
  add_tag: (input: { tracks: Track[], row: number }) => void
  tag_clicked: (input: { tag: string, library_address: string }) => void
  remove_tag: (input: { track: Track, tag: string, library_address: string }) => void
  menu_items: (track: Track, row: number | null) => MenuItem[]
  toggle_inspector: () => void
  // Esc's outer layers, after the menu: search, then (after the selection)
  // the pane. Each answers whether it closed anything.
  clear_search: () => boolean
  close_pane: () => boolean
}

// The first page loading: skeleton rows on the list's column grid.
export const TrackListSkeleton = ({ rows = 12 }: { rows?: number }) => {
  const [hidden] = use_view_pref<readonly ColumnId[]>('hidden-columns', NO_HIDDEN_COLUMNS)
  const [widths] = use_view_pref<ColumnWidths>('column-widths', NO_COLUMN_WIDTHS)
  const visible = visible_columns(hidden)
  return (
    <div className={styles.list} style={{ '--track-columns': grid_template(visible, widths), '--track-min-width': grid_min_width(visible, widths) } as React.CSSProperties} aria-busy='true' aria-label='Loading' data-testid='skeleton'>
      {Array.from({ length: rows }, (_, index) => <TrackRowSkeleton key={index} index={index} columns={visible} />)}
    </div>
  )
}

export const TrackList = ({ source, view_key, total, busy, sort, actions, beside_pane = false }: {
  source: ListSource
  view_key: string
  total: number
  busy: boolean
  // The active sort and how to change it; absent where the list has no sort.
  sort?: { sort: TrackSort, order: SortOrder, on_sort: (sort: TrackSort) => void }
  actions: ListActions
  // The inspector is open beside the list.
  beside_pane?: boolean
}) => {
  const dispatch = use_app_dispatch()
  const store = useStore<RootState>()
  const scroller = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const [menu, set_menu] = useState<{ x: number, y: number, track: Track, row: number } | null>(null)
  const [columns_menu, set_columns_menu] = useState<{ x: number, y: number } | null>(null)
  const [hidden, set_hidden] = use_view_pref<readonly ColumnId[]>('hidden-columns', NO_HIDDEN_COLUMNS)
  const [widths, set_widths] = use_view_pref<ColumnWidths>('column-widths', NO_COLUMN_WIDTHS)
  // The column being dragged together with its width so far: it wins over the
  // persisted widths until the drag ends, so a drag repaints each move without
  // writing local storage on every one.
  const [dragging, set_dragging] = useState<{ id: ColumnId, width: number } | null>(null)
  const widths_ref = useRef(widths)
  widths_ref.current = widths
  const widths_used = useMemo<ColumnWidths>(
    () => dragging === null ? widths : { ...widths, [dragging.id]: dragging.width },
    [widths, dragging]
  )
  const resize_origin = useRef<{ id: ColumnId, client_x: number, width: number } | null>(null)
  const visible = useMemo(() => visible_columns(hidden, beside_pane), [hidden, beside_pane])
  const virtualizer = useVirtualizer({ count: total, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 12 })
  const rows = virtualizer.getVirtualItems()
  const removal = use_label_removal()
  // The way the list last moved, which a stop (direction null) keeps.
  const direction = useRef<'forward' | 'backward'>('forward')
  if (virtualizer.scrollDirection !== null) direction.current = virtualizer.scrollDirection
  const { shown: pages, ahead } = pages_for_rows({ first_row: rows[0]?.index ?? 0, last_row: rows.at(-1)?.index ?? 0, total, direction: direction.current })
  const page_data = use_app_selector((state) => pages.map((page) => select_list_page(state, source, page)), shallowEqual)
  const shown_loaded = page_data.every((page) => page !== undefined)
  const subscribed = use_settled_pages(shown_loaded ? [...pages, ...ahead] : pages, view_key)
  const cursor = use_app_selector((state) => state.list_cursor)
  const current_id = use_app_selector((state) => state.player.queue.entries[state.player.queue.index]?.track_id ?? null)
  const engine_state = use_app_selector((state) => state.player.state)

  useEffect(() => { dispatch(view_entered(view_key)) }, [dispatch, view_key])
  // Focus enters the list with each view, but never leaves a field for it:
  // a search's results are a new view, and typing must stay in the search.
  useEffect(() => {
    if (!is_field(document.activeElement)) scroller.current?.focus({ preventScroll: true })
  }, [view_key])

  const track_at = (row: number): { track: Track, page_tracks: Track[], offset: number } | null => {
    const { page, offset } = row_location(row)
    const page_tracks = select_list_page(store.getState(), source, page)?.items
    const track = page_tracks?.[offset]
    return track === undefined || page_tracks === undefined ? null : { track, page_tracks, offset }
  }
  const action_tracks = (): Track[] =>
    action_rows(store.getState().list_cursor).map((row) => track_at(row)?.track).filter((track): track is Track => track !== undefined)

  const play_row = (row: number) => {
    const found = track_at(row)
    if (found === null) return
    if (found.track.id === current_id && (engine_state === 'playing' || engine_state === 'paused')) {
      actions.play({ page_tracks: found.page_tracks, index: -1 })
      return
    }
    actions.play({ page_tracks: found.page_tracks, index: found.offset })
  }

  const open_menu_at = (row: number, x?: number, y?: number) => {
    const found = track_at(row)
    if (found === null) return
    const element = scroller.current?.querySelector(`[data-row='${row}']`)
    const rect = element?.getBoundingClientRect()
    set_menu({ x: x ?? (rect?.left ?? 0) + 48, y: y ?? rect?.bottom ?? 0, track: found.track, row })
  }

  // Resizing a column with the drag handle on its header: the pointer starts
  // the drag, capture keeps the moves reaching the handle off it, and the
  // width commits to the persisted set on release.
  const resize_start = (id: ColumnId, event: PointerEvent<HTMLElement>): void => {
    if (resize_origin.current !== null) return
    const cell = event.currentTarget.parentElement
    const width = cell === null ? undefined : cell.getBoundingClientRect().width
    if (width === undefined || width <= 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    resize_origin.current = { id, client_x: event.clientX, width }
    set_dragging({ id, width })
  }
  const resize_move = (event: PointerEvent<HTMLElement>): void => {
    const origin = resize_origin.current
    if (origin === null) return
    const width = Math.min(Math.max(origin.width + (event.clientX - origin.client_x), COLUMN_MIN_PX), COLUMN_MAX_PX)
    set_dragging({ id: origin.id, width })
  }
  const resize_end = (): void => {
    if (resize_origin.current === null) return
    resize_origin.current = null
    // A pointer-move and the release commit the row before the release
    // handler runs, so `dragging` here is the width the drag reached.
    if (dragging !== null) set_widths({ ...widths_ref.current, [dragging.id]: Math.round(dragging.width) })
    set_dragging(null)
  }
  // The keyboard path, a focused handle in the header (the list's keys would
  // otherwise move the cursor, so the arrows stop here). Left / Right step by
  // COLUMN_STEP_PX from the column's current width, Shift makes four, and
  // Home restores the default.
  const resize_step = (id: ColumnId, event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter') {
      resize_fit(id)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    if (event.key === 'Home') {
      const next = { ...widths_ref.current }
      delete next[id]
      set_widths(next)
      event.preventDefault()
      event.stopPropagation()
      return
    }
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
    if (direction === 0) return
    const cell = event.currentTarget.parentElement
    const current_px = cell?.getBoundingClientRect().width ?? 0
    const step = event.shiftKey ? COLUMN_STEP_PX * 4 : COLUMN_STEP_PX
    const width = Math.min(Math.max(current_px + direction * step, COLUMN_MIN_PX), COLUMN_MAX_PX)
    set_widths({ ...widths_ref.current, [id]: Math.round(width) })
    event.preventDefault()
    event.stopPropagation()
  }

  // A double-click on the handle, or Enter on a focused one, fits the column
  // to the widest of its header and the rows on screen (the list renders only
  // those), each measured at its natural width rather than its clipped one.
  const resize_fit = (id: ColumnId): void => {
    const natural = (node: Node): number => {
      const range = document.createRange()
      range.selectNodeContents(node)
      return range.getBoundingClientRect().width
    }
    const label = header.current?.querySelector(`[data-col=${id}]`)?.firstChild
    const contents = [...(scroller.current?.querySelectorAll<HTMLElement>(`[role=cell][data-col=${id}]`) ?? [])].map((cell) => {
      if (id !== 'tags') return natural(cell)
      // Every chip whole, folded ones too: they are measured where they hide.
      const line = cell.firstElementChild
      const chips = [...(line?.querySelectorAll<HTMLElement>(':scope > [data-chip]') ?? [])]
      const gap = line === null || line === undefined ? 0 : Number.parseFloat(getComputedStyle(line).columnGap) || 0
      return chips.reduce((sum, chip) => sum + chip.offsetWidth, 0) + gap * Math.max(0, chips.length - 1)
    })
    if (label !== undefined && label !== null) contents.push(natural(label))
    set_widths({ ...widths_ref.current, [id]: fit_column_width({ contents, min: COLUMN_MIN_PX, max: COLUMN_MAX_PX }) })
  }

  // The latest closure for the registered commands, which outlive a render.
  const latest = useRef({ total, actions, play_row, open_menu_at, action_tracks, menu, virtualizer })
  latest.current = { total, actions, play_row, open_menu_at, action_tracks, menu, virtualizer }

  useEffect(() => register_list_commands({
    move: ({ by, extend }) => {
      const { total: count, virtualizer: list } = latest.current
      const to = store.getState().list_cursor.cursor + by
      dispatch(cursor_moved({ to, total: count, extend }))
      list.scrollToIndex(Math.min(Math.max(to, 0), Math.max(count - 1, 0)), { align: 'auto' })
    },
    move_to: ({ edge, extend }) => {
      const { total: count, virtualizer: list } = latest.current
      const to = edge === 'first' ? 0 : count - 1
      dispatch(cursor_moved({ to, total: count, extend }))
      list.scrollToIndex(Math.max(to, 0), { align: 'auto' })
    },
    toggle_selection: () => { dispatch(selection_toggled()) },
    play: () => { latest.current.play_row(store.getState().list_cursor.cursor) },
    play_next: () => { latest.current.actions.queue({ tracks: latest.current.action_tracks(), at: 'next' }) },
    add_to_queue: () => { latest.current.actions.queue({ tracks: latest.current.action_tracks(), at: 'end' }) },
    tag: () => { latest.current.actions.add_tag({ tracks: latest.current.action_tracks(), row: store.getState().list_cursor.cursor }) },
    adopt: () => { latest.current.actions.adopt(latest.current.action_tracks()) },
    open_menu: () => { latest.current.open_menu_at(store.getState().list_cursor.cursor) },
    toggle_inspector: () => { latest.current.actions.toggle_inspector() },
    escape: () => {
      const { menu: open_menu, actions: list_actions } = latest.current
      if (open_menu !== null) {
        set_menu(null)
        return true
      }
      if (list_actions.clear_search()) return true
      if (store.getState().list_cursor.selected.length > 0) {
        dispatch(selection_cleared())
        return true
      }
      return list_actions.close_pane()
    },
    focus: () => { scroller.current?.focus({ preventScroll: true }) }
  }), [dispatch, store])

  // Stable for the list's life, so a memoized row skips the re-render a
  // scroll frame or a store update gives the list.
  const row_handlers = useMemo((): RowHandlers => ({
    on_play: (row) => { latest.current.play_row(row) },
    on_click: (row, event: MouseEvent) => {
      dispatch(row_clicked({ index: row, toggle: event.metaKey || event.ctrlKey, extend: event.shiftKey }))
      scroller.current?.focus({ preventScroll: true })
    },
    on_double_click: (row) => {
      dispatch(row_clicked({ index: row }))
      latest.current.actions.toggle_inspector()
    },
    on_menu: (row, x, y) => {
      dispatch(row_clicked({ index: row }))
      latest.current.open_menu_at(row, x, y)
    },
    on_adopt: (track) => { latest.current.actions.adopt([track]) },
    on_add_tag: (row, track) => {
      dispatch(row_clicked({ index: row }))
      latest.current.actions.add_tag({ tracks: [track], row })
    },
    on_tag: (input) => { latest.current.actions.tag_clicked(input) },
    on_remove_tag: (input) => { latest.current.actions.remove_tag(input) }
  }), [dispatch])

  const play_state_of = (track: Track): RowPlayState => {
    if (track.id !== current_id) return null
    return engine_state === 'loading' ? 'loading' : engine_state === 'playing' ? 'playing' : 'paused'
  }

  const resize_handlers: ResizeHandlers = { start: resize_start, move: resize_move, end: resize_end, step: resize_step, fit: resize_fit }

  return (
    <div
      className={styles.list}
      role='table'
      aria-label='Tracks'
      aria-busy={busy}
      aria-rowcount={total}
      data-testid='track-list'
      style={{ '--track-columns': grid_template(visible, widths_used), '--track-min-width': grid_min_width(visible, widths_used) } as React.CSSProperties}
    >
      <div
        ref={header}
        className={styles.header}
        role='row'
        onContextMenu={(event) => {
          event.preventDefault()
          set_columns_menu({ x: event.clientX, y: event.clientY })
        }}
      >
        <span role='columnheader' className={styles.index_head}>
          <button
            type='button'
            data-variant='glyph'
            aria-label='Columns'
            {...tip('Columns')}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              set_columns_menu({ x: rect.left, y: rect.bottom })
            }}
          >
            <span className={styles.small_glyph}>▼</span>
          </button>
        </span>
        <span role='columnheader' aria-label='Adopt' {...tip('Adopt to library', 'adopt')}>★</span>
        <ColumnHeader id='title' label='Title' column_sort='title' sort={sort} resize_handlers={resize_handlers} />
        {visible.filter(({ lead }) => lead === true).map((column) => (
          <ColumnHeader key={column.id} id={column.id} label={column.label} column_sort={column.sort} sort={sort} resize_handlers={resize_handlers} />
        ))}
        <span role='columnheader'>+tag</span>
        {visible.filter(({ lead }) => lead !== true).map((column) => (
          <ColumnHeader key={column.id} id={column.id} label={column.label} column_sort={column.sort} sort={sort} align={column.align} resize_handlers={resize_handlers} />
        ))}
        <span role='columnheader' />
      </div>
      {subscribed.map((page) => <PageSubscription key={page} source={source} page={page} />)}
      <div
        ref={scroller}
        className={styles.scroller}
        data-testid='track-scroller'
        tabIndex={0}
        aria-activedescendant={`track-row-${cursor.cursor}`}
        // The header sits outside the scroller; it follows sideways scrolling.
        onScroll={(event) => { header.current?.style.setProperty('--scroll-x', `${event.currentTarget.scrollLeft}px`) }}
      >
        <div className={styles.canvas} style={{ height: virtualizer.getTotalSize() }}>
          {rows.map((row) => {
            const { page, offset } = row_location(row.index)
            const page_tracks = page_data[pages.indexOf(page)]?.items
            const track = page_tracks?.[offset]
            return (
              <div key={row.key} id={`track-row-${row.index}`} data-row={row.index} className={styles.slot} style={{ height: row.size, transform: `translateY(${row.start}px)` }}>
                {track === undefined || page_tracks === undefined
                  ? <TrackRowSkeleton index={row.index} columns={visible} />
                  : (
                    <TrackRow
                      track={track}
                      index={row.index}
                      columns={visible}
                      play_state={play_state_of(track)}
                      is_cursor={cursor.cursor === row.index}
                      is_selected={cursor.selected.includes(row.index)}
                      menu_open={menu?.row === row.index}
                      removal={removal}
                      handlers={row_handlers}
                    />
                    )}
              </div>
            )
          })}
        </div>
      </div>
      {menu !== null && <ContextMenu x={menu.x} y={menu.y} items={actions.menu_items(menu.track, menu.row)} on_close={() => { set_menu(null) }} />}
      {columns_menu !== null && (
        <ContextMenu
          x={columns_menu.x}
          y={columns_menu.y}
          on_close={() => { set_columns_menu(null) }}
          items={COLUMNS.map(({ id, label }) => ({
            label,
            checked: !hidden.includes(id),
            on_select: () => { set_hidden(hidden.includes(id) ? hidden.filter((item) => item !== id) : [...hidden, id]) }
          }))}
        />
      )}
    </div>
  )
}

interface ResizeHandlers {
  start: (id: ColumnId, event: PointerEvent<HTMLElement>) => void
  move: (event: PointerEvent<HTMLElement>) => void
  end: () => void
  step: (id: ColumnId, event: KeyboardEvent<HTMLElement>) => void
  fit: (id: ColumnId) => void
}

// A data column's header: its label or sort button, and the drag handle seated
// on the column's right edge, focusable so a handle steps the width by keys
// too. `data-col` lets a start measure the column's current pixel width.
const ColumnHeader = ({ id, label, column_sort, sort, align, resize_handlers }: {
  id: ColumnId
  label: string
  column_sort: TrackSort | undefined
  sort: { sort: TrackSort, order: SortOrder, on_sort: (sort: TrackSort) => void } | undefined
  align?: 'end' | undefined
  resize_handlers: ResizeHandlers
}) => {
  const class_name = [align === 'end' ? styles.end : '', styles.col].filter((name) => name !== '').join(' ')
  const sortable = column_sort !== undefined && sort !== undefined
  const active = sortable && sort.sort === column_sort
  return (
    <span role='columnheader' data-col={id} className={class_name} aria-sort={sortable ? (active ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}>
      {sortable
        ? (
          <button type='button' data-variant='glyph' className={active ? `${styles.sort} ${styles.sort_active}` : styles.sort} onClick={() => { sort.on_sort(column_sort) }}>
            {label}{active && <span className={styles.small_glyph}>{sort.order === 'asc' ? ' ▲' : ' ▼'}</span>}
          </button>
          )
        : label}
      <span
        role='separator'
        aria-orientation='vertical'
        aria-label={`Resize ${label} column`}
        tabIndex={0}
        className={styles.resize_handle}
        onPointerDown={(event) => { resize_handlers.start(id, event) }}
        onPointerMove={(event) => { resize_handlers.move(event) }}
        onPointerUp={() => { resize_handlers.end() }}
        onPointerCancel={() => { resize_handlers.end() }}
        onKeyDown={(event) => { resize_handlers.step(id, event) }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          resize_handlers.fit(id)
        }}
      />
    </span>
  )
}
