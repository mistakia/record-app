// The inline tag adder (STYLE.md § Tag chips), opened by +TAG or t at the
// row rather than as a centred dialog. Tags are per library (spec §8.6.3,
// §8.6.9): one is added into a writable library (an own one, or a shared one
// whose capability grants library.append_tag), defaulting to the library
// being viewed, else the holder written to last, else any holder. A tag is
// removed only from an own active library, since no capability authorises
// dropping one (§3.5.6), and removal confirms: × or Backspace arms it, and
// a second press removes. Keys: ↑ and ↓ move through the suggestions, Enter
// adds the highlighted one or what was typed, Tab completes the field,
// Backspace on an empty field arms the last tag, Esc closes. The adder stays
// open after an add, so several tags go in a row.

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

import styles from './tag-editor.module.css'
import { TagTarget } from './tag-target.tsx'
import { move_highlight, normalize_tag, suggest_tags, tab_completion, type AdderRow } from './tag-suggest.ts'
import { tag_key, use_tag_writes, type ShownTag } from './use-tag-writes.ts'
import type { Track } from '#renderer/api/types.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import { use_write_target } from '#renderer/components/library/target-select.tsx'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_selector } from '#renderer/store/index.ts'

const MAX_TAG_LENGTH = 128
const EDGE_MARGIN = 8
const WIDTH = 300

// The tag with its matched letters lit.
const Lit = ({ tag, matched }: { tag: string, matched: readonly number[] }) => (
  <span className={styles.name}>
    {[...tag].map((char, at) => matched.includes(at) ? <b key={at} className={styles.lit}>{char}</b> : char)}
  </span>
)

export const TagEditor = ({ tracks: initial, anchor, viewed_library, on_close }: {
  tracks: Track[]
  // Where the adder opens: under the row it tags.
  anchor: { x: number, y: number }
  // The library the track list shows ('' for all), the default target.
  viewed_library: string
  on_close: () => void
}) => {
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const visible_tags = node_api.endpoints.get_tags.useQuery(viewed_library === '' ? {} : { library_addresses: [viewed_library] })
  const choice = use_write_target({ action: 'library.append_tag', preferred: viewed_library === '' ? null : viewed_library, holders: initial[0]?.library_addresses ?? [] })
  const { tracks, single, shown, fresh, add, remove, unfresh } = use_tag_writes({ initial, on_added: choice.used })
  const [draft, set_draft] = useState('')
  const [highlight, set_highlight] = useState<number | null>(null)
  const [armed, set_armed] = useState<string | null>(null)
  const [place, set_place] = useState<{ left: number, top?: number, bottom?: number, above: boolean }>({ left: anchor.x, top: anchor.y, above: false })
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const list_id = useId()
  const removable = new Set((libraries.data ?? []).filter(({ is_own, is_retired, library_type }) => is_own && !is_retired && library_type === 'recordstore').map(({ address }) => address))
  const own_tags = single === undefined ? [] : shown.filter(({ library_address }) => removable.has(library_address))
  const rows = writes_allowed ? suggest_tags({ query: draft, tags: visible_tags.data ?? [], exclude: shown.map(({ tag }) => tag) }) : []
  const active = highlight !== null && highlight < rows.length ? highlight : null

  // Opens under the row, or above it when it would run off the window,
  // growing upward from there as chips are added.
  useLayoutEffect(() => {
    const height = ref.current?.getBoundingClientRect().height ?? 0
    const left = Math.max(EDGE_MARGIN, Math.min(anchor.x, window.innerWidth - WIDTH - EDGE_MARGIN))
    if (anchor.y + height + EDGE_MARGIN > window.innerHeight) {
      set_place({ left, bottom: window.innerHeight - Math.max(EDGE_MARGIN, anchor.y - height - 40) - height, above: true })
    } else {
      set_place({ left, top: anchor.y, above: false })
    }
    input.current?.focus()
  }, [anchor.x, anchor.y])

  const close = () => {
    on_close()
    list_commands()?.focus()
  }

  const take = (value: string) => {
    const tag = normalize_tag(value)
    const { target } = choice
    if (!writes_allowed || target === null || tag === '' || tag.length > MAX_TAG_LENGTH) return
    add(tag, target)
    set_draft('')
    set_highlight(null)
    set_armed(null)
  }

  const arm_or_remove = (entry: ShownTag) => {
    const key = tag_key(entry)
    if (armed === key) {
      set_armed(null)
      remove(entry)
    } else {
      set_armed(key)
    }
  }

  const on_key_down = (event: KeyboardEvent<HTMLInputElement>) => {
    const completion = event.key === 'Tab' && !event.shiftKey ? tab_completion({ rows, highlight: active, draft }) : null
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      set_highlight(move_highlight({ highlight: active, count: rows.length, step: event.key === 'ArrowDown' ? 1 : -1 }))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      take(active === null ? draft : (rows[active]?.tag ?? draft))
    } else if (completion !== null) {
      event.preventDefault()
      set_draft(completion)
      set_highlight(null)
    } else if (event.key === 'Backspace' && draft === '' && own_tags.length > 0) {
      event.preventDefault()
      const last = own_tags.at(-1)
      if (last !== undefined) arm_or_remove(last)
    }
    if (event.key !== 'Backspace') set_armed(null)
  }

  const row_view = (row: AdderRow, index: number) => (
    <li
      key={`${row.kind} ${row.tag}`}
      id={`${list_id}-${index}`}
      role='option'
      aria-selected={index === active}
      className={row.kind === 'create' ? styles.create : undefined}
      onMouseEnter={() => { set_highlight(index) }}
      onClick={() => { take(row.tag) }}
    >
      {row.kind === 'tag'
        ? <><Lit tag={row.tag} matched={row.matched} /><span className={styles.count}>{row.count}</span></>
        : <span className={styles.name}>create <span className={styles.quoted}>"{row.tag}"</span></span>}
    </li>
  )

  const title = single === undefined ? `${tracks.length} tracks` : (single.title ?? 'untitled')
  return (
    <div
      ref={ref}
      className={styles.adder}
      style={{ left: place.left, top: place.top, bottom: place.bottom }}
      data-above={place.above}
      role='dialog'
      aria-label='Add tag'
      data-testid='tag-editor'
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }}
      onBlur={(event) => { if (!ref.current?.contains(event.relatedTarget as Node | null)) close() }}
      // Clicks inside keep the field focused.
      onMouseDown={(event) => { if (event.target !== input.current) event.preventDefault() }}
    >
      <div className={styles.stroke}><span className={styles.title}>tag · {title}</span></div>
      {shown.length > 0 && (
        <ul className={styles.tags} aria-label='Tags'>
          {shown.map((entry) => {
            const key = tag_key(entry)
            const can_remove = single !== undefined && removable.has(entry.library_address)
            const classes = [styles.chip, armed === key ? styles.armed : '', fresh.has(key) ? styles.fresh : ''].filter(Boolean).join(' ')
            return (
              <li key={key} className={classes} aria-busy={entry.pending} onAnimationEnd={() => { unfresh(key) }}>
                {entry.tag}
                {can_remove && (
                  <button type='button' data-variant='glyph' aria-label={armed === key ? `Confirm removing tag ${entry.tag}` : `Remove tag ${entry.tag}`} disabled={!writes_allowed} onClick={() => { arm_or_remove({ tag: entry.tag, library_address: entry.library_address }) }}>
                    {armed === key ? 'remove?' : '×'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {choice.targets.length > 0 || choice.resolution.kind === 'loading'
        ? (
          <>
            <input
              ref={input}
              className={styles.field}
              aria-label='New tag'
              role='combobox'
              aria-expanded={rows.length > 0}
              aria-controls={list_id}
              aria-autocomplete='list'
              aria-activedescendant={active === null ? undefined : `${list_id}-${active}`}
              value={draft}
              maxLength={MAX_TAG_LENGTH}
              placeholder={single === undefined ? `tag ${tracks.length} tracks` : 'add a tag'}
              spellCheck={false}
              autoComplete='off'
              disabled={!writes_allowed}
              onChange={(event) => { set_draft(event.target.value.toLowerCase()); set_highlight(null) }}
              onKeyDown={on_key_down}
            />
            {rows.length > 0 && <ul id={list_id} className={styles.suggestions} role='listbox' aria-label='Suggestions' onMouseLeave={() => { set_highlight(null) }}>{rows.map(row_view)}</ul>}
            <TagTarget choice={choice} on_chosen={() => { input.current?.focus() }} />
          </>
          )
        : <p className={styles.note}>You have no library to tag into.</p>}
      {!writes_allowed && <p className={styles.note}>Waiting for the node.</p>}
    </div>
  )
}
