// The inline tag adder (STYLE.md § Tag chips), opened by +TAG or t at the
// row rather than as a centred dialog. Tags are per library (spec §8.6.3,
// §8.6.9): one is added into a writable library (an own one, or a shared one
// whose capability grants library.append_tag), defaulting to the library
// being viewed, else the holder written to last, else any holder. A tag is
// removed only from an own active library, since no capability authorises
// dropping one (§3.5.6), and removal confirms: × or Backspace arms it, and
// a second press removes. Keys: Tab takes the first suggestion, Enter adds,
// Backspace on an empty field arms the last tag, Esc closes.

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import styles from './tag-editor.module.css'
import { normalize_tag, suggest_tags } from './tag-suggest.ts'
import type { Track } from '#renderer/api/types.ts'
import { tip } from '#renderer/components/common/tooltip-logic.ts'
import { list_commands } from '#renderer/components/track/list-commands.ts'
import { TargetSelect, use_write_target } from '#renderer/components/library/target-select.tsx'
import { target_fields } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { select_writes_allowed } from '#renderer/store/connection.ts'
import { use_app_dispatch, use_app_selector } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write } from '#renderer/store/write.ts'

const MAX_TAG_LENGTH = 128
const EDGE_MARGIN = 8

export const TagEditor = ({ tracks: initial, anchor, viewed_library, on_close }: {
  tracks: Track[]
  // Where the adder opens: under the row it tags.
  anchor: { x: number, y: number }
  // The library the track list shows ('' for all), the default target.
  viewed_library: string
  on_close: () => void
}) => {
  const dispatch = use_app_dispatch()
  const writes_allowed = use_app_selector(select_writes_allowed)
  const libraries = node_api.endpoints.get_libraries.useQuery()
  const visible_tags = node_api.endpoints.get_tags.useQuery(viewed_library === '' ? {} : { library_addresses: [viewed_library] })
  const choice = use_write_target({ action: 'library.append_tag', preferred: viewed_library === '' ? null : viewed_library, holders: initial[0]?.library_addresses ?? [] })
  const [tracks, set_tracks] = useState(initial)
  const [draft, set_draft] = useState('')
  const [armed, set_armed] = useState<string | null>(null)
  const [busy, set_busy] = useState(false)
  const [position, set_position] = useState({ left: anchor.x, top: anchor.y })
  const ref = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const single = tracks.length === 1 ? tracks[0] : undefined
  const editable = writes_allowed && !busy
  const removable = new Set((libraries.data ?? []).filter(({ is_own, is_retired, library_type }) => is_own && !is_retired && library_type === 'recordstore').map(({ address }) => address))
  const own_tags = single?.tags.filter(({ library_address }) => removable.has(library_address)) ?? []
  const suggestions = suggest_tags({ query: draft, tags: visible_tags.data ?? [], exclude: single?.tags.map(({ tag }) => tag) ?? [] })

  useLayoutEffect(() => {
    const height = ref.current?.getBoundingClientRect().height ?? 0
    const top = anchor.y + height + EDGE_MARGIN > window.innerHeight ? Math.max(EDGE_MARGIN, anchor.y - height - 40) : anchor.y
    set_position({ left: Math.min(anchor.x, window.innerWidth - 300), top })
    input.current?.focus()
  }, [anchor.x, anchor.y])

  const close = () => {
    on_close()
    list_commands()?.focus()
  }

  const add = async (value: string) => {
    const { target } = choice
    const tag = normalize_tag(value)
    if (!editable || target === null || tag === '' || tag.length > MAX_TAG_LENGTH) return
    set_busy(true)
    const updated: Track[] = []
    for (const track of tracks) {
      const result = await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.add_tag.initiate({ track_id: track.id, tag, ...target_fields(target) })), success: null })
      updated.push(result.ok ? result.data : track)
    }
    set_busy(false)
    set_tracks(updated)
    set_draft('')
    choice.used(target)
    if (tracks.length > 1) dispatch(notified({ kind: 'info', message: `Tagged ${tracks.length} tracks ${tag}.` }))
  }

  const remove = async (tag: string, library_address: string) => {
    if (single === undefined || !editable) return
    set_busy(true)
    const updated = await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.remove_tag.initiate({ track_id: single.id, tag, library_address })), success: null })
    set_busy(false)
    set_armed(null)
    if (updated.ok) set_tracks([updated.data])
  }

  const arm_or_remove = (tag: string, library_address: string) => {
    const key = `${library_address} ${tag}`
    if (armed === key) remove(tag, library_address).catch(() => {})
    else set_armed(key)
  }

  const on_key_down = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab' && suggestions[0] !== undefined) {
      event.preventDefault()
      set_draft(suggestions[0])
    } else if (event.key === 'Backspace' && draft === '' && own_tags.length > 0) {
      event.preventDefault()
      const last = own_tags.at(-1)
      if (last !== undefined) arm_or_remove(last.tag, last.library_address)
    } else if (event.key !== 'Backspace') {
      set_armed(null)
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    add(draft).catch(() => {})
  }

  return (
    <div ref={ref} className={styles.adder} style={position} role='dialog' aria-label='Add tag' data-testid='tag-editor'>
      {single !== undefined && single.tags.length > 0 && (
        <ul className={styles.tags}>
          {single.tags.map(({ tag, library_address }) => {
            const key = `${library_address} ${tag}`
            return (
              <li key={key} className={armed === key ? `${styles.chip} ${styles.armed}` : styles.chip}>
                {tag}
                {removable.has(library_address) && (
                  <button type='button' data-variant='glyph' aria-label={armed === key ? `Confirm removing tag ${tag}` : `Remove tag ${tag}`} {...(armed === key ? {} : tip('Remove tag'))} disabled={!editable} onClick={() => { arm_or_remove(tag, library_address) }}>
                    {armed === key ? 'remove?' : '×'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {choice.targets.length > 0
        ? (
          <form className={styles.form} onSubmit={submit}>
            <input
              ref={input}
              aria-label='New tag'
              value={draft}
              maxLength={MAX_TAG_LENGTH}
              placeholder={tracks.length > 1 ? `tag ${tracks.length} tracks` : 'tag'}
              spellCheck={false}
              autoComplete='off'
              disabled={!writes_allowed}
              onChange={(event) => { set_draft(event.target.value.toLowerCase()) }}
              onKeyDown={on_key_down}
              onBlur={(event) => { if (!ref.current?.contains(event.relatedTarget as Node | null)) close() }}
            />
            <button type='submit' data-size='small' disabled={!editable || normalize_tag(draft) === '' || choice.target === null}>Add</button>
          </form>
          )
        : <p className={styles.note}>You have no library to tag into.</p>}
      {suggestions.length > 0 && (
        <ul className={styles.suggestions} role='listbox' aria-label='Suggestions'>
          {suggestions.map((tag, index) => (
            <li key={tag} role='option' aria-selected={index === 0}>
              <button type='button' data-variant='glyph' tabIndex={-1} onMouseDown={(event) => { event.preventDefault() }} onClick={() => { add(tag).catch(() => {}) }}>{tag}</button>
              {index === 0 && <kbd className={styles.key}>Tab</kbd>}
            </li>
          ))}
        </ul>
      )}
      {choice.targets.length > 1 && <div className={styles.target}><TargetSelect choice={choice} /></div>}
      {!writes_allowed && <p className={styles.note}>Waiting for the node.</p>}
    </div>
  )
}
