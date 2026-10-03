// FilterSpec (spec §3.5.7), shared by capability scoping (§8.6.4) and
// selective replication (§8.6.5a): the node types, the structural checks
// the editor runs before anything is sent, a plain-text description that
// renders node types this version does not know as opaque labels (§8.6.4),
// and the field paths each consumer's subject offers.

export type Scalar = string | number | boolean | null

export type FilterSpec =
  | { type: 'match', fields: Record<string, Scalar> }
  | { type: 'any_of', field: string, values: Scalar[] }
  | { type: 'range', field: string, gte?: number, gt?: number, lte?: number, lt?: number }
  | { type: 'and', filters: FilterSpec[] }
  | { type: 'or', filters: FilterSpec[] }
  | { type: 'not', filter: FilterSpec }

export type FilterType = FilterSpec['type']
export const FILTER_TYPES: readonly FilterType[] = ['match', 'any_of', 'range', 'and', 'or', 'not']

export const MAX_DEPTH = 16
const RANGE_BOUNDS = ['gte', 'gt', 'lte', 'lt'] as const
const ALLOWED_KEYS: Record<FilterType, readonly string[]> = {
  match: ['type', 'fields'],
  any_of: ['type', 'field', 'values'],
  range: ['type', 'field', ...RANGE_BOUNDS],
  and: ['type', 'filters'],
  or: ['type', 'filters'],
  not: ['type', 'filter']
}

const is_object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const is_scalar = (value: unknown): value is Scalar =>
  value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
const is_field_path = (value: unknown): value is string => typeof value === 'string' && value !== '' && value.split('.').every((step) => step !== '')

export const is_known_type = (type: unknown): type is FilterType => typeof type === 'string' && (FILTER_TYPES as readonly string[]).includes(type)

// The problems that would make the node refuse a filter, or make it match
// nothing: an unknown type or field, a missing or mistyped field, a count
// out of bounds, or nesting past 16 levels. Empty when the filter is sound.
export const filter_problems = (spec: unknown, depth = 1, at = 'filter'): string[] => {
  if (depth > MAX_DEPTH) return [`${at} is nested more than ${MAX_DEPTH} levels deep.`]
  if (!is_object(spec)) return [`${at} is not a filter.`]
  const { type } = spec
  if (!is_known_type(type)) return [`${at} has a type this app does not know: ${String(type)}.`]
  const extra = Object.keys(spec).filter((key) => !ALLOWED_KEYS[type].includes(key))
  const problems = extra.map((key) => `${at} (${type}) has a field it does not define: ${key}.`)
  switch (type) {
    case 'match': {
      const entries = is_object(spec.fields) ? Object.entries(spec.fields) : null
      if (entries === null || entries.length < 1 || entries.length > 16) problems.push(`${at} (match) needs 1 to 16 fields.`)
      for (const [path, value] of entries ?? []) {
        if (!is_field_path(path)) problems.push(`${at} (match) has an empty field path.`)
        if (!is_scalar(value)) problems.push(`${at} (match) field ${path} needs a text, number, true/false, or null value.`)
      }
      break
    }
    case 'any_of':
      if (!is_field_path(spec.field)) problems.push(`${at} (any of) needs a field.`)
      if (!Array.isArray(spec.values) || spec.values.length < 1 || spec.values.length > 256) problems.push(`${at} (any of) needs 1 to 256 values.`)
      else if (!spec.values.every(is_scalar)) problems.push(`${at} (any of) has a value that is not text, a number, true/false, or null.`)
      break
    case 'range': {
      if (!is_field_path(spec.field)) problems.push(`${at} (range) needs a field.`)
      const bounds = RANGE_BOUNDS.filter((bound) => spec[bound] !== undefined)
      if (bounds.length === 0) problems.push(`${at} (range) needs at least one bound.`)
      for (const bound of bounds) if (typeof spec[bound] !== 'number' || !Number.isFinite(spec[bound])) problems.push(`${at} (range) bound ${bound} must be a number.`)
      break
    }
    case 'and':
    case 'or':
      if (!Array.isArray(spec.filters) || spec.filters.length < 1 || spec.filters.length > 64) problems.push(`${at} (${type}) needs 1 to 64 filters.`)
      else spec.filters.forEach((child, index) => { problems.push(...filter_problems(child, depth + 1, `${at}.${index + 1}`)) })
      break
    case 'not':
      problems.push(...filter_problems(spec.filter, depth + 1, `${at} (not)`))
      break
  }
  return problems
}

const show = (value: unknown): string => typeof value === 'string' ? `"${value}"` : JSON.stringify(value) ?? String(value)

// One line of plain text. Anything this version does not define reads as an
// opaque label rather than being dropped or reinterpreted.
export const describe_filter = (spec: unknown): string => {
  if (!is_object(spec)) return '(unreadable filter)'
  const { type } = spec
  if (!is_known_type(type)) return `(unknown filter: ${String(type)})`
  const extra = Object.keys(spec).filter((key) => !ALLOWED_KEYS[type].includes(key))
  const suffix = extra.length === 0 ? '' : ` (unknown fields: ${extra.join(', ')})`
  switch (type) {
    case 'match':
      return (is_object(spec.fields) ? Object.entries(spec.fields).map(([path, value]) => `${path} is ${show(value)}`).join(' and ') : '(unreadable match)') + suffix
    case 'any_of':
      return `${String(spec.field)} is any of ${Array.isArray(spec.values) ? spec.values.map(show).join(', ') : '(unreadable values)'}${suffix}`
    case 'range': {
      const words = { gte: 'at least', gt: 'over', lte: 'at most', lt: 'under' }
      return `${String(spec.field)} ${RANGE_BOUNDS.filter((bound) => spec[bound] !== undefined).map((bound) => `${words[bound]} ${show(spec[bound])}`).join(' and ')}${suffix}`
    }
    case 'and':
    case 'or':
      return Array.isArray(spec.filters) ? `(${spec.filters.map(describe_filter).join(type === 'and' ? ' and ' : ' or ')})${suffix}` : `(unreadable ${type})`
    case 'not':
      return `not ${describe_filter(spec.filter)}${suffix}`
  }
}

export type FieldKind = 'text' | 'number' | 'list'

export interface FilterField {
  path: string
  label: string
  kind: FieldKind
}

// A capability's filter reads the entry envelope as written (§2.2, §3.5.6):
// the content payload is a CID there, so only envelope fields resolve.
export const CAPABILITY_FIELDS: readonly FilterField[] = [
  { path: 'tags', label: 'Tags', kind: 'list' },
  { path: 'type', label: 'Entry type (track, about)', kind: 'text' },
  { path: 'timestamp', label: 'Written at (ms since 1970)', kind: 'number' },
  { path: 'id', label: 'Track id', kind: 'text' },
  { path: 'content', label: 'Content CID', kind: 'text' }
]

// A selective replication filter reads the track view of §4.6.1.
export const REPLICATION_FIELDS: readonly FilterField[] = [
  { path: 'tags', label: 'Tags', kind: 'list' },
  { path: 'artist', label: 'Artist', kind: 'text' },
  { path: 'title', label: 'Title', kind: 'text' },
  { path: 'duration_seconds', label: 'Duration (seconds)', kind: 'number' },
  { path: 'audio_size_bytes', label: 'Audio size (bytes)', kind: 'number' },
  { path: 'added_at', label: 'Added at (ms since 1970)', kind: 'number' },
  { path: 'added_by', label: 'Added by (public key)', kind: 'text' },
  { path: 'source', label: 'Source (extractor)', kind: 'list' },
  { path: 'library_address', label: 'Library address', kind: 'text' },
  { path: 'cid', label: 'Audio CID', kind: 'text' }
]

// A fresh node of a type, as the editor starts it.
export const blank_filter = (type: FilterType, field = 'tags'): FilterSpec => {
  switch (type) {
    case 'match': return { type, fields: { [field]: '' } }
    case 'any_of': return { type, field, values: [''] }
    case 'range': return { type, field, gte: 0 }
    case 'and':
    case 'or': return { type, filters: [blank_filter('match', field)] }
    case 'not': return { type, filter: blank_filter('match', field) }
  }
}
