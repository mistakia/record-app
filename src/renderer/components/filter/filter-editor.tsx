// The FilterSpec builder (spec §8.6.6, §8.9.1): a structured editor over the
// six node types, with field paths suggested from the consumer's subject,
// and an advanced JSON mode. It edits a draft that keeps the typed text
// (filter-draft.ts) and emits a FilterSpec when the draft reads as one, or
// undefined while it does not, so a caller never sends a filter other than
// the one on screen. A filter the structured editor cannot show (an unknown
// node type, a malformed node) opens in JSON mode only, never rewritten
// (§8.6.4).

import { useEffect, useId, useRef, useState } from 'react'

import styles from './filter-editor.module.css'
import { blank_draft, BOUND_KEYS, can_draft, from_draft, to_draft, type FilterDraft } from '#renderer/filter/filter-draft.ts'
import { describe_filter, filter_problems, FILTER_TYPES, type FilterField, type FilterType } from '#renderer/filter/filter-spec.ts'

const TYPE_LABELS: Record<FilterType, string> = {
  match: 'Field equals',
  any_of: 'Field is any of',
  range: 'Number in range',
  and: 'All of',
  or: 'Any of',
  not: 'Not'
}
const BOUND_LABELS = { gte: 'at least', gt: 'over', lte: 'at most', lt: 'under' } as const

const FieldInput = ({ value, fields, list_id, on_change }: { value: string, fields: readonly FilterField[], list_id: string, on_change: (path: string) => void }) => (
  <input
    className={styles.field}
    aria-label='Field'
    list={list_id}
    spellCheck={false}
    placeholder='field'
    value={value}
    title={fields.find((field) => field.path === value)?.label ?? 'A dot-separated field path'}
    onChange={(event) => { on_change(event.target.value) }}
  />
)

const DraftNode = ({ draft, fields, list_id, depth, on_change, on_remove }: {
  draft: FilterDraft
  fields: readonly FilterField[]
  list_id: string
  depth: number
  on_change: (draft: FilterDraft) => void
  on_remove?: (() => void) | undefined
}) => {
  const first_field = fields[0]?.path ?? 'tags'
  const header = (
    <div className={styles.header}>
      <select aria-label='Filter type' value={draft.type} onChange={(event) => { on_change(blank_draft(event.target.value as FilterType, first_field)) }}>
        {FILTER_TYPES.map((type) => <option key={type} value={type} disabled={depth >= 16 && ['and', 'or', 'not'].includes(type)}>{TYPE_LABELS[type]}</option>)}
      </select>
      {on_remove !== undefined && <button type='button' aria-label='Remove filter' onClick={on_remove}>Remove</button>}
    </div>
  )
  switch (draft.type) {
    case 'match': {
      const set_rows = (rows: Array<{ path: string, text: string }>) => { on_change({ type: 'match', rows }) }
      return (
        <div className={styles.node}>
          {header}
          {draft.rows.map((row, index) => (
            <div key={index} className={styles.row}>
              <FieldInput value={row.path} fields={fields} list_id={list_id} on_change={(path) => { set_rows(draft.rows.map((each, at) => at === index ? { ...each, path } : each)) }} />
              <span>is</span>
              <input aria-label='Value' value={row.text} onChange={(event) => { set_rows(draft.rows.map((each, at) => at === index ? { ...each, text: event.target.value } : each)) }} />
              {draft.rows.length > 1 && <button type='button' aria-label='Remove field' onClick={() => { set_rows(draft.rows.filter((_, at) => at !== index)) }}>Remove</button>}
            </div>
          ))}
          {draft.rows.length < 16 && <button type='button' onClick={() => { set_rows([...draft.rows, { path: '', text: '' }]) }}>Add field</button>}
        </div>
      )
    }
    case 'any_of':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.row}>
            <FieldInput value={draft.field} fields={fields} list_id={list_id} on_change={(field) => { on_change({ ...draft, field }) }} />
            <span>is any of</span>
          </div>
          {draft.values.map((value, index) => (
            <div key={index} className={styles.row}>
              <input aria-label='Value' value={value} onChange={(event) => { on_change({ ...draft, values: draft.values.map((each, at) => at === index ? event.target.value : each) }) }} />
              {draft.values.length > 1 && <button type='button' aria-label='Remove value' onClick={() => { on_change({ ...draft, values: draft.values.filter((_, at) => at !== index) }) }}>Remove</button>}
            </div>
          ))}
          {draft.values.length < 256 && <button type='button' onClick={() => { on_change({ ...draft, values: [...draft.values, ''] }) }}>Add value</button>}
        </div>
      )
    case 'range':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.row}>
            <FieldInput value={draft.field} fields={fields} list_id={list_id} on_change={(field) => { on_change({ ...draft, field }) }} />
            {BOUND_KEYS.map((key) => (
              <label key={key} className={styles.bound}>
                {BOUND_LABELS[key]}
                <input aria-label={BOUND_LABELS[key]} inputMode='decimal' value={draft.bounds[key]} onChange={(event) => { on_change({ ...draft, bounds: { ...draft.bounds, [key]: event.target.value } }) }} />
              </label>
            ))}
          </div>
        </div>
      )
    case 'and':
    case 'or':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.children}>
            {draft.children.map((child, index) => (
              <DraftNode
                key={index}
                draft={child}
                fields={fields}
                list_id={list_id}
                depth={depth + 1}
                on_change={(next) => { on_change({ ...draft, children: draft.children.map((each, at) => at === index ? next : each) }) }}
                on_remove={draft.children.length > 1 ? () => { on_change({ ...draft, children: draft.children.filter((_, at) => at !== index) }) } : undefined}
              />
            ))}
          </div>
          {draft.children.length < 64 && <button type='button' onClick={() => { on_change({ ...draft, children: [...draft.children, blank_draft('match', first_field)] }) }}>Add condition</button>}
        </div>
      )
    case 'not':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.children}>
            <DraftNode draft={draft.child} fields={fields} list_id={list_id} depth={depth + 1} on_change={(child) => { on_change({ ...draft, child }) }} />
          </div>
        </div>
      )
  }
}

const as_json = (value: unknown): string => value === null || value === undefined ? '' : JSON.stringify(value, null, 2)

// value null is "no filter", and undefined a filter still being edited that
// does not yet read as one. Callers send nothing while value is undefined
// or filter_problems finds anything.
export const FilterEditor = ({ value, on_change, fields, label = 'Filter' }: {
  value: unknown
  on_change: (value: unknown) => void
  fields: readonly FilterField[]
  label?: string
}) => {
  const list_id = useId()
  const [draft, set_draft] = useState<FilterDraft | null>(() => can_draft(value, fields) ? to_draft(value) : null)
  const [json_mode, set_json_mode] = useState(() => value !== null && value !== undefined && !can_draft(value, fields))
  const [json_text, set_json_text] = useState(() => as_json(value))
  const [draft_error, set_draft_error] = useState<string | null>(null)
  // The last value this editor emitted, so a change from outside (a reset
  // after issuing) can be told apart from an echo of our own edit.
  const emitted = useRef<unknown>(value)

  useEffect(() => {
    if (Object.is(value, emitted.current)) return
    emitted.current = value
    set_draft(can_draft(value, fields) ? to_draft(value) : null)
    set_json_text(as_json(value))
    set_draft_error(null)
    if (value !== null && value !== undefined && !can_draft(value, fields)) set_json_mode(true)
  }, [value])

  const emit = (next: unknown) => {
    emitted.current = next
    on_change(next)
  }

  const edit_draft = (next: FilterDraft) => {
    set_draft(next)
    const result = from_draft(next, fields)
    set_draft_error(result.ok ? null : result.reason)
    emit(result.ok ? result.spec : undefined)
  }

  const edit_json = (text: string) => {
    set_json_text(text)
    if (text.trim() === '') {
      set_draft_error('Enter a filter, or turn the filter off.')
      emit(undefined)
      return
    }
    try {
      const parsed = JSON.parse(text) as unknown
      // null here is text being typed, not "no filter": the checkbox says that.
      if (parsed === null) {
        set_draft_error('Enter a filter, or turn the filter off.')
        emit(undefined)
        return
      }
      set_draft_error(null)
      emit(parsed)
    } catch {
      set_draft_error('Not valid JSON yet.')
      emit(undefined)
    }
  }

  const toggle = (on: boolean) => {
    if (!on) {
      set_draft(null)
      set_json_text('')
      set_draft_error(null)
      emit(null)
      return
    }
    const fresh = blank_draft('match', fields[0]?.path ?? 'tags')
    set_json_mode(false)
    edit_draft(fresh)
    set_json_text('')
  }

  const enabled = value !== null
  const structured_ok = value === undefined ? draft !== null && !json_mode : can_draft(value, fields)
  const problems = value === null || value === undefined ? [] : filter_problems(value)

  return (
    <fieldset className={styles.editor} data-testid='filter-editor'>
      <legend>{label}</legend>
      <datalist id={list_id}>{fields.map((field) => <option key={field.path} value={field.path}>{field.label}</option>)}</datalist>
      <div className={styles.header}>
        <label>
          <input type='checkbox' checked={enabled} onChange={(event) => { toggle(event.target.checked) }} />
          Use a filter
        </label>
        {enabled && (json_mode
          ? <button type='button' data-variant='ghost' data-size='small' disabled={!structured_ok} onClick={() => { if (can_draft(value, fields)) set_draft(to_draft(value)); set_json_mode(false) }}>Structured editor</button>
          : <button type='button' data-variant='ghost' data-size='small' disabled={value === undefined} title={value === undefined ? 'Finish the filter first' : undefined} onClick={() => { set_json_text(as_json(value)); set_json_mode(true) }}>Edit as JSON</button>)}
      </div>
      {enabled && (json_mode || draft === null
        ? <textarea aria-label='Filter JSON' className={styles.json} rows={8} spellCheck={false} value={json_text} onChange={(event) => { edit_json(event.target.value) }} />
        : <DraftNode draft={draft} fields={fields} list_id={list_id} depth={1} on_change={edit_draft} />)}
      {enabled && value !== undefined && <p className={styles.summary} data-testid='filter-summary'>{describe_filter(value)}</p>}
      {draft_error !== null && <p className={styles.error}>{draft_error}</p>}
      {problems.map((problem) => <p key={problem} className={styles.error}>{problem}</p>)}
    </fieldset>
  )
}
