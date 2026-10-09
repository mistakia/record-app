// What an identity goes by before it names itself: a two-word handle read
// from its public key, so the same identity reads the same on every device
// and two identities rarely share one. A display default only; nothing is
// written to the profile. Its avatar is its default library's pattern
// (components/common/avatar-pattern.ts).

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
