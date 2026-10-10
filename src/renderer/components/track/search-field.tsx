// The track list's search field (STYLE.md § Track list › Header row), a
// combobox over the recent searches: focused while empty it lists them;
// arrows and Enter or a click run one, `×` drops one, `clear` drops all.
// Leaving the field with text records it. Typing closes the list.

import { useId, useRef, useState } from 'react'

import { recent_search_key } from './recent-searches.ts'
import styles from './search-field.module.css'
import { keep_focus } from '#renderer/components/common/keep-focus.ts'
import { SEARCH_INPUT_ID } from '#renderer/hooks/use-hotkeys.ts'
import { clear_searches, record_search, remove_search, use_search_history } from '#renderer/prefs/search-history.ts'

export const SearchField = ({ value, on_change, on_submit }: {
  value: string
  on_change: (value: string) => void
  // Enter or ↓ with no recent search highlighted.
  on_submit: () => void
}) => {
  const input = useRef<HTMLInputElement>(null)
  const list_id = useId()
  const history = use_search_history()
  const [open, set_open] = useState(false)
  const [highlighted, set_highlighted] = useState(-1)
  const shown = open && value === '' && history.length > 0
  const active = shown ? Math.min(highlighted, history.length - 1) : -1

  const show = () => { set_open(true); set_highlighted(-1) }
  const run = (query: string) => {
    set_open(false)
    record_search(query)
    on_change(query)
  }

  return (
    <div className={styles.search}>
      <input
        ref={input}
        id={SEARCH_INPUT_ID}
        type='search'
        role='combobox'
        aria-label='Search tracks'
        aria-expanded={shown}
        aria-controls={shown ? list_id : undefined}
        aria-autocomplete='list'
        aria-activedescendant={active >= 0 ? `${list_id}-${active}` : undefined}
        placeholder='search'
        spellCheck={false}
        value={value}
        onFocus={() => { if (value === '') show() }}
        onMouseDown={() => { if (value === '' && !open) show() }}
        // Leaving the field keeps its text; the clear controls never take
        // the focus, so a discarded search is not kept.
        onBlur={() => { set_open(false); record_search(value) }}
        onChange={(event) => {
          const next = event.target.value
          if (next === '') show()
          else set_open(false)
          on_change(next)
        }}
        onKeyDown={(event) => {
          const result = shown ? recent_search_key({ key: event.key, highlighted: active, count: history.length }) : null
          if (result !== null) {
            event.preventDefault()
            // Esc closes the list before the app's Esc chain sees it.
            event.stopPropagation()
            if (result.kind === 'highlight') set_highlighted(result.index)
            else if (result.kind === 'close') set_open(false)
            else run(history[result.index] ?? '')
            return
          }
          if (event.key === 'Enter' || event.key === 'ArrowDown') {
            event.preventDefault()
            on_submit()
          }
        }}
      />
      {value !== '' && (
        <button type='button' data-variant='glyph' aria-label='Clear search' onMouseDown={keep_focus} onClick={() => { on_change(''); show(); input.current?.focus() }}>×</button>
      )}
      {shown && (
        <div className={styles.recent} onMouseDown={keep_focus}>
          <span className={styles.label} id={`${list_id}-label`}>Recent</span>
          <ul className={styles.list} id={list_id} role='listbox' aria-labelledby={`${list_id}-label`}>
            {history.map((query, index) => (
              <li
                key={query}
                id={`${list_id}-${index}`}
                className={styles.option}
                role='option'
                aria-selected={index === active}
                onClick={() => { run(query) }}
                onMouseMove={() => { if (index !== active) set_highlighted(index) }}
              >
                <span className={styles.query}>{query}</span>
                <button
                  type='button'
                  data-variant='glyph'
                  tabIndex={-1}
                  aria-label={`Remove ${query}`}
                  onClick={(event) => { event.stopPropagation(); remove_search(query) }}
                >×
                </button>
              </li>
            ))}
          </ul>
          <button type='button' data-variant='ghost' tabIndex={-1} className={styles.clear} onClick={clear_searches}>clear</button>
        </div>
      )}
    </div>
  )
}
