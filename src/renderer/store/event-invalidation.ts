// Which cached node data each event makes stale (spec §8.8.5, incremental
// updates). Events may repeat or go missing (§8.7.7), so they only ever mark
// data for refetch; nothing is patched from an event payload.

export const NODE_API_TAGS = ['settings', 'libraries', 'tracks', 'tags', 'about', 'listens', 'peers', 'capabilities', 'own_libraries', 'replication_policy'] as const
export type NodeApiTag = typeof NODE_API_TAGS[number]

export const tags_for_event = (type: string): NodeApiTag[] => {
  if (type.startsWith('track:')) return ['tracks', 'tags']
  // A finished index batch changes track lists, tags, and per-library counts.
  if (type === 'library:index-updated') return ['tracks', 'tags', 'libraries']
  if (type === 'library:peer-joined' || type === 'library:peer-left') return ['libraries', 'peers']
  if (type === 'library:linked' || type === 'library:unlinked') return ['libraries', 'tracks', 'tags', 'about']
  // A revocation made entries inert: tracks and tags may have changed.
  if (type === 'library:entries-inert') return ['tracks', 'tags', 'libraries', 'capabilities']
  if (type === 'library:replication-policy-changed') return ['libraries', 'replication_policy']
  if (type.startsWith('library:')) return ['libraries']
  // Own libraries created or retired here or on another of the identity's
  // devices (§4.8.5).
  if (type === 'identity:library-created' || type === 'identity:library-retired') return ['libraries', 'about']
  if (type.startsWith('peer:')) return ['peers']
  // A capability issued or revoked changes which libraries are writable.
  if (type === 'capability:issued' || type === 'capability:revoked') return ['capabilities', 'libraries']
  // import:* drives the importer's progress list, not the cache; the tracks
  // an import adds arrive as track:added.
  return []
}

// Coalesces tags so a burst of events (a bulk ingest sends one per track)
// refetches each surface at most once per interval: the first event flushes
// after interval_ms, and later ones join that flush. A flush that returns a
// promise (its refetches settling) holds the next one until it settles, and
// the gap after it is load_factor times as long as it took, up to max_gap_ms:
// a node that takes seconds per page (a large aggregated view under ingest)
// spends at most 1 / (1 + load_factor) of its time on this client's
// refetches, instead of every request it can serve while health checks and
// the event connection queue behind them.
export const create_invalidation_batcher = ({ flush, interval_ms = 1000, load_factor = 3, max_gap_ms = 30_000 }: {
  flush: (tags: NodeApiTag[]) => Promise<unknown> | void
  interval_ms?: number
  load_factor?: number
  max_gap_ms?: number
}): { add: (tags: NodeApiTag[]) => void, drain: () => NodeApiTag[], cancel: () => void } => {
  const pending = new Set<NodeApiTag>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let in_flight = false
  let cancelled = false
  let gap_ms = interval_ms
  const schedule = (): void => {
    if (timer !== null || in_flight || cancelled || pending.size === 0) return
    timer = setTimeout(() => {
      timer = null
      const tags_to_flush = [...pending]
      pending.clear()
      const started = Date.now()
      const settling = flush(tags_to_flush)
      if (settling === undefined) return schedule()
      in_flight = true
      settling.catch(() => {}).finally(() => {
        in_flight = false
        gap_ms = Math.min(max_gap_ms, Math.max(interval_ms, (Date.now() - started) * load_factor))
        schedule()
      })
    }, gap_ms)
  }
  return {
    add: (tags) => {
      for (const tag of tags) pending.add(tag)
      schedule()
    },
    // The pending tags, handed over instead of flushed later.
    drain: () => {
      if (timer !== null) clearTimeout(timer)
      timer = null
      const tags = [...pending]
      pending.clear()
      return tags
    },
    cancel: () => {
      if (timer !== null) clearTimeout(timer)
      timer = null
      cancelled = true
      pending.clear()
    }
  }
}
