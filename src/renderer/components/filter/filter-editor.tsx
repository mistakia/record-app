// The FilterSpec builder (spec §8.6.6, §8.9.1), shared by capability issue
// and the selective replication policy: a structured editor over the six
// node types, with field paths suggested from the consumer's subject, and
// an advanced JSON mode. A filter holding a node type this app does not
// know opens in JSON mode only, so it is never silently rewritten (§8.6.4).

import { useId, useState } from 'react'

import styles from './filter-editor.module.css'
import { blank_filter, describe_filter, filter_problems, FILTER_TYPES, is_known_type, type FilterField, type FilterSpec, type FilterType, type Scalar } from '#renderer/filter/filter-spec.ts'

const TYPE_LABELS: Record<FilterType, string> = {
  match: 'Field equals',
  any_of: 'Field is any of',
  range: 'Number in range',
  and: 'All of',
  or: 'Any of',
  not: 'Not'
}

// Text typed for a value: a number for a numeric field when it reads as one,
// otherwise the text itself.
const parse_value = (text: string, fields: readonly FilterField[], path: string): Scalar => {
  const kind = fields.find((field) => field.path === path)?.kind
  if (kind === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) return Number(text)
  return text
}

const show_value = (value: Scalar): string => value === null ? '' : String(value)

const FieldInput = ({ value, fields, list_id, on_change }: { value: string, fields: readonly FilterField[], list_id: string, on_change: (path: string) => void }) => (
  <input className={styles.field} aria-label='Field' list={list_id} spellCheck={false} placeholder='field' value={value} onChange={(event) => { on_change(event.target.value.trim()) }} title={fields.find((field) => field.path === value)?.label ?? 'A dot-separated field path'} />
)

const FilterNode = ({ spec, fields, list_id, depth, on_change, on_remove }: {
  spec: FilterSpec
  fields: readonly FilterField[]
  list_id: string
  depth: number
  on_change: (spec: FilterSpec) => void
  on_remove?: () => void
}) => {
  const first_field = fields[0]?.path ?? 'tags'
  const header = (
    <div className={styles.header}>
      <select aria-label='Filter type' value={spec.type} onChange={(event) => { on_change(blank_filter(event.target.value as FilterType, first_field)) }}>
        {FILTER_TYPES.map((type) => <option key={type} value={type} disabled={depth >= 16 && ['and', 'or', 'not'].includes(type)}>{TYPE_LABELS[type]}</option>)}
      </select>
      {on_remove !== undefined && <button type='button' aria-label='Remove filter' onClick={on_remove}>Remove</button>}
    </div>
  )
  switch (spec.type) {
    case 'match': {
      const entries = Object.entries(spec.fields)
      const set_entries = (next: Array<[string, Scalar]>) => { on_change({ type: 'match', fields: Object.fromEntries(next) }) }
      return (
        <div className={styles.node}>
          {header}
          {entries.map(([path, value], index) => (
            <div key={index} className={styles.row}>
              <FieldInput value={path} fields={fields} list_id={list_id} on_change={(next) => { set_entries(entries.map((entry, at) => at === index ? [next, entry[1]] : entry)) }} />
              <span>is</span>
              <input aria-label='Value' value={show_value(value)} onChange={(event) => { set_entries(entries.map((entry, at) => at === index ? [entry[0], parse_value(event.target.value, fields, path)] : entry)) }} />
              {entries.length > 1 && <button type='button' aria-label='Remove field' onClick={() => { set_entries(entries.filter((_, at) => at !== index)) }}>Remove</button>}
            </div>
          ))}
          {entries.length < 16 && <button type='button' onClick={() => { set_entries([...entries, ['', '']]) }}>Add field</button>}
        </div>
      )
    }
    case 'any_of':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.row}>
            <FieldInput value={spec.field} fields={fields} list_id={list_id} on_change={(field) => { on_change({ ...spec, field }) }} />
            <span>is any of</span>
            <input
              aria-label='Values'
              placeholder='comma, separated, values'
              value={spec.values.map(show_value).join(', ')}
              onChange={(event) => { on_change({ ...spec, values: event.target.value.split(',').map((part) => parse_value(part.trim(), fields, spec.field)) }) }}
            />
          </div>
        </div>
      )
    case 'range': {
      const bound = (key: 'gte' | 'gt' | 'lte' | 'lt', label: string) => (
        <label className={styles.bound}>
          {label}
          <input
            aria-label={label}
            inputMode='decimal'
            value={spec[key] === undefined ? '' : String(spec[key])}
            onChange={(event) => {
              const { [key]: _dropped, ...rest } = spec
              const text = event.target.value.trim()
              on_change(text === '' || !Number.isFinite(Number(text)) ? rest : { ...rest, [key]: Number(text) })
            }}
          />
        </label>
      )
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.row}>
            <FieldInput value={spec.field} fields={fields} list_id={list_id} on_change={(field) => { on_change({ ...spec, field }) }} />
            {bound('gte', 'at least')}
            {bound('gt', 'over')}
            {bound('lte', 'at most')}
            {bound('lt', 'under')}
          </div>
        </div>
      )
    }
    case 'and':
    case 'or':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.children}>
            {spec.filters.map((child, index) => (
              <FilterNode
                key={index}
                spec={child}
                fields={fields}
                list_id={list_id}
                depth={depth + 1}
                on_change={(next) => { on_change({ ...spec, filters: spec.filters.map((existing, at) => at === index ? next : existing) }) }}
                {...(spec.filters.length > 1 ? { on_remove: () => { on_change({ ...spec, filters: spec.filters.filter((_, at) => at !== index) }) } } : {})}
              />
            ))}
          </div>
          {spec.filters.length < 64 && <button type='button' onClick={() => { on_change({ ...spec, filters: [...spec.filters, blank_filter('match', first_field)] }) }}>Add condition</button>}
        </div>
      )
    case 'not':
      return (
        <div className={styles.node}>
          {header}
          <div className={styles.children}>
            <FilterNode spec={spec.filter} fields={fields} list_id={list_id} depth={depth + 1} on_change={(filter) => { on_change({ ...spec, filter }) }} />
          </div>
        </div>
      )
  }
}

// Whether every node is one the structured editor can show.
const all_known = (spec: unknown): boolean => {
  if (typeof spec !== 'object' || spec === null) return false
  const { type, filters, filter } = spec as { type?: unknown, filters?: unknown, filter?: unknown }
  if (!is_known_type(type)) return false
  if (Array.isArray(filters)) return filters.every(all_known)
  if (filter !== undefined) return all_known(filter)
  return true
}

// value null is "no filter". on_change receives the filter as edited, sound
// or not; callers check filter_problems before sending.
export const FilterEditor = ({ value, on_change, fields, label = 'Filter' }: {
  value: unknown
  on_change: (value: unknown) => void
  fields: readonly FilterField[]
  label?: string
}) => {
  const list_id = useId()
  const structured_ok = value === null || all_known(value)
  const [json_mode, set_json_mode] = useState(!structured_ok)
  const [json_text, set_json_text] = useState(value === null ? '' : JSON.stringify(value, null, 2))
  const [json_error, set_json_error] = useState<string | null>(null)
  const problems = value === null ? [] : filter_problems(value)

  const open_json = () => {
    set_json_text(value === null ? '' : JSON.stringify(value, null, 2))
    set_json_error(null)
    set_json_mode(true)
  }

  return (
    <fieldset className={styles.editor} data-testid='filter-editor'>
      <legend>{label}</legend>
      <datalist id={list_id}>{fields.map((field) => <option key={field.path} value={field.path}>{field.label}</option>)}</datalist>
      <div className={styles.header}>
        <label>
          <input type='checkbox' checked={value !== null} onChange={(event) => { on_change(event.target.checked ? blank_filter('match', fields[0]?.path ?? 'tags') : null) }} />
          Use a filter
        </label>
        {value !== null && (json_mode || !structured_ok
          ? <button type='button' disabled={!structured_ok} onClick={() => { set_json_mode(false) }}>Structured editor</button>
          : <button type='button' onClick={open_json}>Edit as JSON</button>)}
      </div>
      {value !== null && (json_mode || !structured_ok
        ? (
          <>
            <textarea
              aria-label='Filter JSON'
              className={styles.json}
              rows={8}
              spellCheck={false}
              value={json_text}
              onChange={(event) => {
                set_json_text(event.target.value)
                try {
                  on_change(JSON.parse(event.target.value) as unknown)
                  set_json_error(null)
                } catch {
                  set_json_error('Not valid JSON yet.')
                }
              }}
            />
            {json_error !== null && <p className={styles.error}>{json_error}</p>}
          </>
          )
        : <FilterNode spec={value as FilterSpec} fields={fields} list_id={list_id} depth={1} on_change={on_change} />)}
      {value !== null && <p className={styles.summary} data-testid='filter-summary'>{describe_filter(value)}</p>}
      {problems.map((problem) => <p key={problem} className={styles.error}>{problem}</p>)}
    </fieldset>
  )
}
