// Cache ids for node data held per library (spec §8.8.5): one per library
// address, or the aggregated view across all of them.

export const AGGREGATE = '*'

export const library_ids = (addresses: readonly string[] | undefined): string[] =>
  addresses === undefined || addresses.length === 0 ? [AGGREGATE] : [...addresses]
