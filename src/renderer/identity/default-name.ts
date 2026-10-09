// What an identity goes by before it names itself: a two-word handle and a
// 5×5 mirrored pattern, both read from its public key, so the same identity
// looks the same on every device and two identities rarely look alike. A
// display default only; nothing is written to the profile.

const ADJECTIVES = [
  'amber', 'ashen', 'bright', 'brisk', 'calm', 'cedar', 'clear', 'coral',
  'crisp', 'dusky', 'early', 'ember', 'fair', 'fleet', 'gentle', 'gilt',
  'glad', 'golden', 'hazel', 'hollow', 'idle', 'inky', 'ivory', 'jade',
  'keen', 'late', 'linen', 'lunar', 'mellow', 'misty', 'mossy', 'muted',
  'noble', 'north', 'ochre', 'olive', 'pale', 'quiet', 'rapid', 'russet',
  'rustic', 'sable', 'sandy', 'silver', 'slate', 'slow', 'smoky', 'snowy',
  'soft', 'solar', 'south', 'still', 'stormy', 'sunny', 'tawny', 'tidal',
  'umber', 'velvet', 'vivid', 'warm', 'west', 'wild', 'windy', 'woven'
] as const

const NOUNS = [
  'alder', 'aria', 'basin', 'bell', 'birch', 'brook', 'canyon', 'cello',
  'chord', 'cliff', 'cove', 'crane', 'delta', 'dune', 'echo', 'falcon',
  'fern', 'finch', 'fjord', 'flute', 'grove', 'harbor', 'harp', 'heron',
  'hymn', 'island', 'lark', 'ledge', 'lute', 'lyre', 'maple', 'marsh',
  'meadow', 'mesa', 'oboe', 'orbit', 'otter', 'pine', 'plover', 'prairie',
  'quail', 'raven', 'reed', 'ridge', 'river', 'robin', 'sparrow', 'spruce',
  'stone', 'swift', 'tempo', 'thrush', 'tide', 'timber', 'valley', 'verse',
  'viola', 'wave', 'willow', 'wren', 'yarrow', 'zephyr', 'drum', 'reel'
] as const

// The key's x coordinate as bytes; the 02 or 03 prefix carries one bit.
const key_bytes = (public_key: string): number[] =>
  (public_key.slice(2).match(/[0-9a-f]{2}/gi) ?? []).map((pair) => parseInt(pair, 16))

export const key_handle = (public_key: string): string => {
  const bytes = key_bytes(public_key)
  return `${ADJECTIVES[(bytes[0] ?? 0) % ADJECTIVES.length]} ${NOUNS[(bytes[1] ?? 0) % NOUNS.length]}`
}

// Row-major 5×5 cells, the right two columns mirroring the left two.
export const key_pattern = (public_key: string): boolean[] => {
  const bytes = key_bytes(public_key).slice(2)
  const cells: boolean[] = []
  for (let row = 0; row < 5; row++) {
    const half = [0, 1, 2].map((column) => ((bytes[row * 3 + column] ?? 0) & 1) === 1)
    cells.push(half[0] ?? false, half[1] ?? false, half[2] ?? false, half[1] ?? false, half[0] ?? false)
  }
  return cells
}
