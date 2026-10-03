// Which cached node data each event makes stale (spec §8.8.5, incremental
// updates). Events may repeat or go missing (§8.7.7), so they only ever mark
// data for refetch; nothing is patched from an event payload.

export const NODE_API_TAGS = ['settings', 'libraries', 'tracks'] as const
export type NodeApiTag = typeof NODE_API_TAGS[number]

export const tags_for_event = (type: string): NodeApiTag[] => {
  if (type.startsWith('track:')) return ['tracks']
  // A finished index batch changes track lists and per-library counts.
  if (type === 'library:index-updated') return ['tracks', 'libraries']
  if (type.startsWith('library:')) return ['libraries']
  // import:* drives the importer, and peer:* the peer list, in later phases.
  return []
}

// Coalesces tags so a burst of events (a bulk ingest sends one per track)
// refetches each surface at most once per interval: the first event flushes
// after interval_ms, and later ones join that flush.
export const create_invalidation_batcher = ({ flush, interval_ms = 1000 }: {
  flush: (tags: NodeApiTag[]) => void
  interval_ms?: number
}): { add: (tags: NodeApiTag[]) => void, cancel: () => void } => {
  const pending = new Set<NodeApiTag>()
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    add: (tags) => {
      for (const tag of tags) pending.add(tag)
      if (timer !== null || pending.size === 0) return
      timer = setTimeout(() => {
        timer = null
        const tags_to_flush = [...pending]
        pending.clear()
        flush(tags_to_flush)
      }, interval_ms)
    },
    cancel: () => {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending.clear()
    }
  }
}
