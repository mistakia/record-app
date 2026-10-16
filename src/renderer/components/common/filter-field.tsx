// A text filter disclosed on demand (STYLE.md § Tag chips, § Facet
// sidebar): a quiet lowercase `filter` until asked for, then a small field,
// focused, that narrows a list as it is typed. Esc, or leaving it empty,
// puts it away and the full list back.

import styles from './filter-field.module.css'

export const FilterToggle = ({ on_open, label }: { on_open: () => void, label: string }) => (
  <button
    type='button'
    data-variant='glyph'
    className={styles.toggle}
    aria-label={`Filter ${label.toLowerCase()}`}
    data-testid='filter-toggle'
    onClick={(event) => {
      event.stopPropagation()
      on_open()
    }}
  >
    filter
  </button>
)

export const FilterField = ({ value, on_change, on_dismiss, label, className }: {
  value: string
  on_change: (value: string) => void
  // Esc, or the field left empty.
  on_dismiss: () => void
  label: string
  className?: string | undefined
}) => (
  <input
    type='search'
    className={[styles.field, className].join(' ')}
    aria-label={`Filter ${label.toLowerCase()}`}
    placeholder='filter'
    spellCheck={false}
    autoComplete='off'
    // Asked for, so it takes the focus at once.
    autoFocus
    data-testid='filter-field'
    value={value}
    onChange={(event) => { on_change(event.target.value) }}
    onBlur={() => { if (value.trim() === '') on_dismiss() }}
    onKeyDown={(event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      on_dismiss()
    }}
  />
)
