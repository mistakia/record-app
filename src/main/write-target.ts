// The target a write names (chapter 7 write targets, spec §8.6.3), as main
// accepts it from the renderer (§8.10.3): a library address and an optional
// capability id, both plain printable text the node then judges. Every
// write that appends to a library must name one. Imports nothing from
// Electron.

export interface WriteTargetFields {
  library_address: string
  capability_id?: string
}

const PRINTABLE = /^[\x21-\x7e]{1,512}$/

export const check_write_target = (input: unknown): WriteTargetFields | null => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const { library_address, capability_id } = input as Record<string, unknown>
  if (typeof library_address !== 'string' || !PRINTABLE.test(library_address)) return null
  if (capability_id !== undefined && (typeof capability_id !== 'string' || !PRINTABLE.test(capability_id))) return null
  return capability_id === undefined ? { library_address } : { library_address, capability_id }
}

// The JSON writes the generic request channel carries that append to a
// library, and where each carries its target. A unit test checks this
// against every write the pinned yaml gives a target.
export const TARGETED_WRITES: Record<string, 'body' | 'query'> = {
  'post /tracks': 'body',
  'patch /tracks/{id}': 'body',
  'delete /tracks/{id}': 'query',
  'post /tags': 'body',
  'delete /tags': 'query',
  'post /import/url': 'body'
}

export const refused_without_target = (request: { method: string, path_template: string, body?: unknown, query?: unknown }): string | null => {
  const where = TARGETED_WRITES[`${request.method} ${request.path_template}`]
  if (where === undefined) return null
  const source = (where === 'body' ? request.body : request.query) as Record<string, unknown> | undefined
  const fields = typeof source === 'object' && source !== null ? { library_address: source.library_address, capability_id: source.capability_id } : null
  return check_write_target(fields) === null ? 'This write must name its target library.' : null
}
