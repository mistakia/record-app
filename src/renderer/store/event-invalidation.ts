// Which cached node data each event makes stale (spec §8.8.5, incremental
// updates). Events may repeat or go missing (§8.7.7), so they only ever mark
// data for refetch; nothing is patched from an event payload.

export const NODE_API_TAGS = ['settings', 'libraries', 'tracks', 'tags', 'about', 'listens', 'peers'] as const
export type NodeApiTag = typeof NODE_API_TAGS[number]

export const tags_for_event = (type: string): NodeApiTag[] => {
  if (type.startsWith('track:')) return ['tracks', 'tags']
  // A finished index batch changes track lists, tags, and per-library counts.
  if (type === 'library:index-updated') return ['tracks', 'tags', 'libraries']
  if (type === 'library:peer-joined' || type === 'library:peer-left') return ['libraries', 'peers']
  if (type === 'library:linked' || type === 'library:unlinked') return ['libraries', 'tracks', 'tags', 'about']
  if (type.startsWith('library:')) return ['libraries']
  // Own libraries created or retired here or on another of the identity's
  // devices (§4.8.5).
  if (type === 'identity:library-created' || type === 'identity:library-retired') return ['libraries', 'about']
  if (type.startsWith('peer:')) return ['peers']
  // import:* drives the importer's progress list, not the cache; the tracks
  // an import adds arrive as track:added.
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
