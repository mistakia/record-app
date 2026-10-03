// The editor's working copy of a FilterSpec. It keeps what the user typed
// as text, so a half-typed number, a value with spaces or commas, or two
// rows naming the same field survive editing; it becomes a FilterSpec only
// when every part reads as one.

import { filter_problems, type FieldKind, type FilterField, type FilterSpec, type FilterType, type Scalar } from './filter-spec.ts'

export type BoundKey = 'gte' | 'gt' | 'lte' | 'lt'
export const BOUND_KEYS: readonly BoundKey[] = ['gte', 'gt', 'lte', 'lt']

export type FilterDraft =
  | { type: 'match', rows: Array<{ path: string, text: string }> }
  | { type: 'any_of', field: string, values: string[] }
  | { type: 'range', field: string, bounds: Record<BoundKey, string> }
  | { type: 'and' | 'or', children: FilterDraft[] }
  | { type: 'not', child: FilterDraft }

const show = (value: unknown): string => value === null || value === undefined ? '' : String(value)
const empty_bounds = (): Record<BoundKey, string> => ({ gte: '', gt: '', lte: '', lt: '' })

export const blank_draft = (type: FilterType, field = 'tags'): FilterDraft => {
  switch (type) {
    case 'match': return { type, rows: [{ path: field, text: '' }] }
    case 'any_of': return { type, field, values: [''] }
    case 'range': return { type, field, bounds: { ...empty_bounds(), gte: '0' } }
    case 'and':
    case 'or': return { type, children: [blank_draft('match', field)] }
    case 'not': return { type, child: blank_draft('match', field) }
  }
}

// A sound FilterSpec as a draft; callers check filter_problems first.
export const to_draft = (spec: FilterSpec): FilterDraft => {
  switch (spec.type) {
    case 'match': return { type: 'match', rows: Object.entries(spec.fields).map(([path, value]) => ({ path, text: show(value) })) }
    case 'any_of': return { type: 'any_of', field: spec.field, values: spec.values.map(show) }
    case 'range': return { type: 'range', field: spec.field, bounds: { gte: show(spec.gte), gt: show(spec.gt), lte: show(spec.lte), lt: show(spec.lt) } }
    case 'and':
    case 'or': return { type: spec.type, children: spec.filters.map(to_draft) }
    case 'not': return { type: 'not', child: to_draft(spec.filter) }
  }
}

const kind_of = (fields: readonly FilterField[], path: string): FieldKind | undefined => fields.find((field) => field.path === path)?.kind

// Text for a numeric field becomes a number when it reads as one.
const to_scalar = (text: string, kind: FieldKind | undefined): Scalar =>
  kind === 'number' && text.trim() !== '' && Number.isFinite(Number(text)) ? Number(text) : text

export type DraftResult = { ok: true, spec: FilterSpec } | { ok: false, reason: string }

export const from_draft = (draft: FilterDraft, fields: readonly FilterField[]): DraftResult => {
  switch (draft.type) {
    case 'match': {
      const paths = draft.rows.map(({ path }) => path.trim())
      if (paths.some((path) => path === '')) return { ok: false, reason: 'Every row needs a field.' }
      const repeated = paths.find((path, index) => paths.indexOf(path) !== index)
      if (repeated !== undefined) return { ok: false, reason: `The field ${repeated} is listed twice.` }
      return { ok: true, spec: { type: 'match', fields: Object.fromEntries(draft.rows.map(({ path, text }) => [path.trim(), to_scalar(text, kind_of(fields, path.trim()))])) } }
    }
    case 'any_of': {
      const field = draft.field.trim()
      return { ok: true, spec: { type: 'any_of', field, values: draft.values.map((text) => to_scalar(text, kind_of(fields, field))) } }
    }
    case 'range': {
      const spec: FilterSpec = { type: 'range', field: draft.field.trim() }
      for (const key of BOUND_KEYS) {
        const text = draft.bounds[key].trim()
        if (text === '') continue
        const value = Number(text)
        if (!Number.isFinite(value)) return { ok: false, reason: `The bound "${text}" is not a number.` }
        spec[key] = value
      }
      return { ok: true, spec }
    }
    case 'and':
    case 'or': {
      const filters: FilterSpec[] = []
      for (const child of draft.children) {
        const result = from_draft(child, fields)
        if (!result.ok) return result
        filters.push(result.spec)
      }
      return { ok: true, spec: { type: draft.type, filters } }
    }
    case 'not': {
      const result = from_draft(draft.child, fields)
      return result.ok ? { ok: true, spec: { type: 'not', filter: result.spec } } : result
    }
  }
}

// Whether the structured editor can show a filter: a sound one only, since a
// malformed node of a known type has nothing it could render.
export const can_draft = (value: unknown): value is FilterSpec => filter_problems(value).length === 0
