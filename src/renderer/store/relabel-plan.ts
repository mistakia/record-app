// The Tags page's relabel plan: a label mapping (rename, merge, facet move,
// delete) turned into what the node accepts. A change is a label-record
// write (spec §2.5) to each label library the identity can write: it unsets
// every source pair a track carries there and sets the target. The node has
// no library-wide relabel, so the job collects the tracks a library labels
// with a source (GET /tracks, chunked into `tag_groups` queries) and writes
// them through POST /tags/batch in batches (relabel-batches.ts). Pure: the
// job does the I/O.

import type { Capability } from '#renderer/api/types.ts'
import { choose_capability, type LabelSubject, type WriteTarget } from '#renderer/library/write-targets.ts'
import { label_facet } from './label-facets.ts'

// `to_label` null deletes the source.
export interface LabelMapping {
  from_label: string
  to_label: string | null
}

export type RefusalReason =
  | 'chain'
  | 'conflicting_targets'
  | 'managed_source'
  | 'managed_target'
  | 'empty_target'
  | 'target_too_long'
  | 'control_character'

export interface RefusedMapping {
  mapping: LabelMapping
  reason: RefusalReason
}

// §2.5's label bound, in UTF-8 bytes after NFC.
const MAX_LABEL_BYTES = 128
const CONTROL_CHARACTER = /\p{Cc}/u

// A collection query's `tag_groups` stays well under Node's 16 KiB header
// limit beside `label_libraries`; the node takes at most 256 labels a group.
export const COLLECTION_LIMITS = { query_bytes: 6 * 1024, labels: 256 } as const

export const utf8_bytes = (text: string): number => new TextEncoder().encode(text).length

const target_problem = (label: string): RefusalReason | null => {
  if (label === '') return 'empty_target'
  if (utf8_bytes(label) > MAX_LABEL_BYTES) return 'target_too_long'
  if (CONTROL_CHARACTER.test(label)) return 'control_character'
  return null
}

// The mapping as the node will read it: NFC throughout, empty sources and
// identity pairs dropped, and refused what would chain (a target that is
// also a source), touch a managed label, or name a target the node would
// reject. A source repeated with the same target counts once.
export const checked_mappings = ({ mappings, managed }: {
  mappings: readonly LabelMapping[]
  managed: ReadonlySet<string>
}): { mappings: LabelMapping[], refused: RefusedMapping[] } => {
  const normal = mappings
    .map(({ from_label, to_label }) => ({ from_label: from_label.normalize('NFC'), to_label: to_label === null ? null : to_label.normalize('NFC') }))
    .filter(({ from_label, to_label }) => from_label !== '' && from_label !== to_label)
  const sources = new Set(normal.map(({ from_label }) => from_label))
  const problem = ({ from_label, to_label }: LabelMapping): RefusalReason | null => {
    if (managed.has(from_label)) return 'managed_source'
    if (to_label === null) return null
    if (managed.has(to_label)) return 'managed_target'
    if (sources.has(to_label)) return 'chain'
    return target_problem(to_label)
  }
  const accepted = new Map<string, LabelMapping>()
  const refused: RefusedMapping[] = []
  for (const mapping of normal) {
    const { from_label, to_label } = mapping
    const reason = problem(mapping)
    if (reason !== null) {
      refused.push({ mapping, reason })
      continue
    }
    const earlier = accepted.get(from_label)
    if (earlier === undefined) accepted.set(from_label, mapping)
    else if (earlier.to_label !== to_label) refused.push({ mapping, reason: 'conflicting_targets' })
  }
  return { mappings: [...accepted.values()], refused }
}

// Every label under a facet moved to another prefix, as one mapping, so a
// track carrying several of them gets one item. `to_prefix` '' makes them
// hand labels; `to_prefix` names the facet without its slash.
export const prefix_mappings = ({ labels, from_prefix, to_prefix }: {
  labels: readonly string[]
  from_prefix: string
  to_prefix: string
}): LabelMapping[] => labels
  .filter((label) => label_facet(label) === from_prefix)
  .map((label) => {
    const value = label.slice(from_prefix.length + 1)
    return { from_label: label, to_label: to_prefix === '' ? value : `${to_prefix}/${value}` }
  })

// The capability a shared library's write cites for one mapping on one
// track: one whose filter admits both the unset of the source and the set
// of the target (§3.5.6). An own library cites none.
export const mapping_capability = ({ target, held, mapping, track_id, now }: {
  target: WriteTarget
  held: readonly Capability[]
  mapping: LabelMapping
  track_id: string
  now: number
}): { capability_id: string | null } | null => {
  if (target.category === 'own') return { capability_id: null }
  const subjects: LabelSubject[] = [{ type: 'label', op: 'unset', track_id, label: mapping.from_label }]
  if (mapping.to_label !== null) subjects.push({ type: 'label', op: 'set', track_id, label: mapping.to_label })
  const usable = held.filter((capability) => subjects.every((subject) =>
    choose_capability({ held: [capability], library_address: target.library_address, action: 'library.write_label', subject, now }) !== null))
  const chosen = choose_capability({ held: usable, library_address: target.library_address, action: 'library.write_label', now })
  return chosen === null ? null : { capability_id: chosen.capability_id }
}

// The mappings a library's right covers. Whether a filter admits a pair
// can depend on the track, so this asks with no track id: a filter that
// reads one fails closed here and the mapping is named as not covered.
export const covered_mappings = ({ target, held, mappings, now = Date.now() }: {
  target: WriteTarget
  held: readonly Capability[]
  mappings: readonly LabelMapping[]
  now?: number
}): { covered: LabelMapping[], uncovered: LabelMapping[] } => {
  const covered: LabelMapping[] = []
  const uncovered: LabelMapping[] = []
  for (const mapping of mappings) {
    if (mapping_capability({ target, held, mapping, track_id: '', now }) === null) uncovered.push(mapping)
    else covered.push(mapping)
  }
  return { covered, uncovered }
}

// The form-encoded length a value adds to a query string.
const query_length = (text: string): number => new URLSearchParams({ q: text }).toString().length - 2

// GET /tracks queries that together find every track the given libraries
// label with a source. Each chunk is one `tag_groups` group (any-of); groups AND, so
// chunks are separate queries whose results the job unions by track id.
export const collection_queries = ({ label_libraries, mappings }: {
  label_libraries: string[]
  mappings: readonly LabelMapping[]
}): Array<{ label_libraries: string[], tag_groups: string }> => {
  const empty = query_length('[[]]')
  const chunks: string[][] = []
  let chunk: string[] = []
  let length = empty
  const separator = query_length(',')
  for (const { from_label } of mappings) {
    const label_length = query_length(JSON.stringify(from_label))
    if (chunk.length > 0 && (length + separator + label_length > COLLECTION_LIMITS.query_bytes || chunk.length === COLLECTION_LIMITS.labels)) {
      chunks.push(chunk)
      chunk = []
      length = empty
    }
    length += label_length + (chunk.length === 0 ? 0 : separator)
    chunk.push(from_label)
  }
  if (chunk.length > 0) chunks.push(chunk)
  return chunks.map((labels) => ({ label_libraries, tag_groups: JSON.stringify([labels]) }))
}
