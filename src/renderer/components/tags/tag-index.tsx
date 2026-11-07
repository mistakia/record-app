// The Tags page's index (STYLE.md § Tags page): one virtualized list of
// facet header rows over their label rows, 22px each. The cursor, anchor
// and selection are labels, not positions, since every labels-changed
// refetch re-sorts the rows. It registers as the shown list, answering the
// cursor keys, Enter (open the label in Tracks, or fold a facet), `e`,
// Backspace, `i` and the row menu; any other list key falls through, so
// `f` still adopts the playing track here.

import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'

import styles from './tag-index.module.css'
import { move_cursor, relabel_request, select_range, shown_label, shown_selection, TAG_LIST_ACTIONS, toggled, type RelabelRequest, type TagIndexRow } from './tag-index-rows.ts'
import type { TagCount } from '#renderer/api/types.ts'
import { ContextMenu, type MenuItem } from '#renderer/components/common/context-menu.tsx'
import { register_list_commands } from '#renderer/components/track/list-commands.ts'
import type { HotkeyAction } from '#renderer/hooks/hotkeys.ts'
import { label_value } from '#renderer/store/label-facets.ts'

const ROW_HEIGHT = 22

const TAG_LIST_LABELS: Partial<Record<HotkeyAction, string>> = { activate: 'Open the label in Tracks, or fold the facet' }

const NONE: ReadonlySet<string> = new Set()

export const TagIndex = ({ rows, counts, on_open, on_fold, on_request, on_refuse, on_toggle_inspector, on_cursor }: {
  rows: readonly TagIndexRow[]
  // Every label, unscoped, so `e` on a facet header takes all its labels.
  counts: readonly TagCount[]
  on_open: (label: string) => void
  on_fold: (key: string) => void
  on_request: (request: RelabelRequest) => void
  on_refuse: (message: string) => void
  on_toggle_inspector: () => void
  on_cursor: (row: TagIndexRow | null) => void
}) => {
  const scroller = useRef<HTMLDivElement>(null)
  const [cursor, set_cursor] = useState<string | null>(null)
  const [anchor, set_anchor] = useState<string | null>(null)
  const [selected, set_selected] = useState<ReadonlySet<string>>(NONE)
  const [menu, set_menu] = useState<{ x: number, y: number } | null>(null)
  const virtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 20 })

  // A cursor whose label went (renamed, deleted, filtered out) stays at its
  // place in the list, on whatever row is there now.
  const last_index = useRef(0)
  const at = rows.findIndex(({ key }) => key === cursor)
  if (at !== -1) last_index.current = at
  const shown_cursor = at !== -1 ? cursor : rows[Math.min(last_index.current, rows.length - 1)]?.key ?? null
  const cursor_row = rows.find(({ key }) => key === shown_cursor) ?? null
  useEffect(() => { on_cursor(cursor_row) }, [cursor_row, on_cursor])

  const go_to = (key: string | null, extend: boolean): void => {
    if (key === null) return
    set_cursor(key)
    if (extend) {
      const from = anchor ?? shown_cursor ?? key
      set_anchor(from)
      set_selected(new Set(select_range(rows, from, key)))
    } else {
      set_anchor(key)
    }
    const index = rows.findIndex((row) => row.key === key)
    if (index !== -1) virtualizer.scrollToIndex(index, { align: 'auto' })
  }

  const ask = (verb: 'rename' | 'delete'): void => {
    const answer = relabel_request({ verb, rows, counts, cursor: shown_cursor, selected })
    if (answer === null) return
    if ('refusal' in answer) on_refuse(answer.refusal)
    else on_request(answer.request)
  }

  const activate = (row: TagIndexRow | null): void => {
    if (row === null) return
    if (row.kind === 'facet') on_fold(row.key)
    else on_open(row.tag)
  }

  // The latest closure for the registered commands, which outlive a render.
  const latest = useRef({ rows, shown_cursor, cursor_row, selected, go_to, ask, activate, on_toggle_inspector })
  latest.current = { rows, shown_cursor, cursor_row, selected, go_to, ask, activate, on_toggle_inspector }

  useEffect(() => register_list_commands({
    actions: TAG_LIST_ACTIONS,
    labels: TAG_LIST_LABELS,
    move: ({ by, extend }) => { const { rows: list, shown_cursor: at, go_to: go } = latest.current; go(move_cursor(list, at, by), extend) },
    move_to: ({ edge, extend }) => { const { rows: list, go_to: go } = latest.current; go((edge === 'first' ? list[0] : list.at(-1))?.key ?? null, extend) },
    toggle_selection: () => {
      const { cursor_row: row, selected: chosen } = latest.current
      if (row?.kind === 'label') set_selected(toggled(chosen, row.tag))
    },
    activate: () => { latest.current.activate(latest.current.cursor_row) },
    rename_labels: () => { latest.current.ask('rename') },
    delete_labels: () => { latest.current.ask('delete') },
    toggle_inspector: () => { latest.current.on_toggle_inspector() },
    open_menu: () => {
      const { rows: list, shown_cursor: at } = latest.current
      const index = list.findIndex(({ key }) => key === at)
      const box = scroller.current?.getBoundingClientRect()
      if (box === undefined || index === -1) return
      set_menu({ x: box.left + 24, y: box.top + (index + 1) * ROW_HEIGHT - (scroller.current?.scrollTop ?? 0) })
    },
    escape: () => {
      if (latest.current.selected.size > 0) {
        set_selected(NONE)
        return true
      }
      return false
    },
    focus: () => { scroller.current?.focus({ preventScroll: true }) }
  }), [])

  // Focus enters the list on page load (STYLE.md § Keyboard Model).
  useEffect(() => { scroller.current?.focus({ preventScroll: true }) }, [])

  const chosen = new Set(shown_selection(rows, selected))
  // The menu names what e would do: the selection when there is one, else the row.
  const rename = relabel_request({ verb: 'rename', rows, counts, cursor: shown_cursor, selected })
  let rename_label = 'Rename'
  if (rename !== null && 'request' in rename && rename.request.kind === 'rename_facet') rename_label = 'Rename facet'
  else if (rename !== null && 'request' in rename && rename.request.labels.length > 1) rename_label = 'Merge'
  const menu_items: MenuItem[] = cursor_row === null
    ? []
    : [
        ...(cursor_row.kind === 'label' ? [{ label: 'Open in Tracks', shortcut: 'Enter', on_select: () => { on_open(cursor_row.tag) } }] : []),
        { label: rename_label, shortcut: 'e', on_select: () => { ask('rename') } },
        { label: 'Delete', shortcut: 'Backspace', on_select: () => { ask('delete') } }
      ]

  return (
    <div ref={scroller} className={styles.scroller} tabIndex={0} role='listbox' aria-label='Labels' aria-multiselectable data-testid='tag-index'>
      <div className={styles.inner} style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index]!
          const is_cursor = row.key === shown_cursor
          const click = (event: React.MouseEvent): void => {
            go_to(row.key, event.shiftKey)
            if (event.metaKey && row.kind === 'label') {
              set_selected(toggled(selected, row.tag))
            } else if (!event.shiftKey) {
              set_selected(NONE)
            }
          }
          return (
            <div
              key={row.key}
              role='option'
              aria-selected={row.kind === 'label' && chosen.has(row.tag)}
              data-cursor={is_cursor}
              data-testid={row.kind === 'facet' ? 'tag-facet-row' : 'tag-row'}
              data-label={row.kind === 'label' ? row.tag : undefined}
              className={row.kind === 'facet' ? styles.facet : styles.label}
              style={{ transform: `translateY(${item.start}px)` }}
              onClick={click}
              onDoubleClick={() => { activate(row) }}
              onContextMenu={(event) => {
                event.preventDefault()
                // A row outside the selection is the menu's subject alone.
                if (row.kind !== 'label' || !selected.has(row.tag)) set_selected(NONE)
                go_to(row.key, false)
                set_menu({ x: event.clientX, y: event.clientY })
              }}
            >
              {row.kind === 'facet'
                ? (
                  <>
                    <button type='button' data-variant='glyph' className={styles.chevron} aria-expanded={!row.folded} aria-label={`${row.folded ? 'Unfold' : 'Fold'} ${row.facet ?? 'hand labels'}`} onClick={(event) => { event.stopPropagation(); on_fold(row.key) }}>{row.folded ? '▶' : '▼'}</button>
                    <span className={styles.facet_name}>{row.facet ?? 'labels'}</span>
                    <span className={styles.facet_count}>{row.label_count}</span>
                    {row.managed && <span className={styles.pill} data-testid='managed-mark'>managed</span>}
                    <span className={styles.rule} aria-hidden='true' />
                    <span className={styles.count}>{row.total}</span>
                  </>
                  )
                : (
                  <>
                    <span className={styles.value} title={row.tag}>{shown_label(label_value(row.tag))}</span>
                    {row.managed && <span className={styles.pill} data-testid='managed-mark'>managed</span>}
                    {!row.managed && row.not_writable && <span className={styles.pill}>not yours</span>}
                    <span className={styles.count}>{row.count}</span>
                  </>
                  )}
            </div>
          )
        })}
      </div>
      {menu !== null && menu_items.length > 0 && <ContextMenu x={menu.x} y={menu.y} items={menu_items} on_close={() => { set_menu(null) }} />}
    </div>
  )
}
