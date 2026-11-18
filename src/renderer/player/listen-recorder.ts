// Listen recording (spec §8.9.1): one listen per play once it has been
// heard for the threshold (60 s), counted in played context time, so pauses
// and seeks neither add nor skip time. A track shorter than the threshold
// counts once played to within a second of its end.
//
// A listen gets its client_listen_id and listened_at_ms when the threshold
// is crossed and keeps both on every attempt, so the node counts it once
// and dates it when it was heard (chapter 7 POST /listens). It is saved
// under the node it was captured against before the first attempt and
// leaves storage only once the node took it or retrying would not help, so
// a listen survives a failed request, a restart, and a switch to another
// node, and is only ever sent to its own node.

export const LISTEN_THRESHOLD_SECONDS = 60
const MAX_PENDING = 100

export interface Listen {
  track_id: string
  library_address: string
}

export interface CapturedListen extends Listen {
  client_listen_id: string
  listened_at_ms: number
}

type ListenStorage = Pick<Storage, 'getItem' | 'setItem'>

const storage_key = (node_key: string): string => `record:pending-listens:${node_key}`

const is_captured_listen = (value: unknown): value is CapturedListen => {
  if (typeof value !== 'object' || value === null) return false
  const listen = value as Record<string, unknown>
  return typeof listen.track_id === 'string' && typeof listen.library_address === 'string' &&
    typeof listen.client_listen_id === 'string' && typeof listen.listened_at_ms === 'number'
}

export const required_listen_seconds = ({ duration_seconds, threshold_seconds = LISTEN_THRESHOLD_SECONDS }: {
  duration_seconds: number
  threshold_seconds?: number
}): number => duration_seconds > 0 ? Math.min(threshold_seconds, Math.max(duration_seconds - 1, 0)) : threshold_seconds

export const create_listen_recorder = ({
  record,
  get_node_key,
  storage,
  threshold_seconds = LISTEN_THRESHOLD_SECONDS,
  now = Date.now,
  mint_id = () => crypto.randomUUID()
}: {
  // Resolves true when the node took the listen, or when retrying would not
  // help; false to keep it for a retry.
  record: (listen: CapturedListen) => Promise<boolean>
  get_node_key: () => string | null
  storage: ListenStorage
  threshold_seconds?: number
  now?: () => number
  mint_id?: () => string
}) => {
  let recorded_play_id = 0
  const in_flight = new Set<string>()

  const read_pending = (node_key: string): CapturedListen[] => {
    try {
      const parsed = JSON.parse(storage.getItem(storage_key(node_key)) ?? '[]') as unknown
      return Array.isArray(parsed) ? parsed.filter(is_captured_listen) : []
    } catch {
      return []
    }
  }

  const write_pending = (node_key: string, pending: CapturedListen[]): void => {
    try {
      storage.setItem(storage_key(node_key), JSON.stringify(pending.slice(-MAX_PENDING)))
    } catch {}
  }

  const send = (node_key: string, listen: CapturedListen): void => {
    if (in_flight.has(listen.client_listen_id)) return
    in_flight.add(listen.client_listen_id)
    record(listen)
      .catch(() => false)
      .then((taken) => {
        if (taken) write_pending(node_key, read_pending(node_key).filter(({ client_listen_id }) => client_listen_id !== listen.client_listen_id))
      })
      .finally(() => { in_flight.delete(listen.client_listen_id) })
  }

  return {
    observe: ({ play_id, played_seconds, duration_seconds, listen }: {
      play_id: number
      played_seconds: number
      duration_seconds: number
      listen: Listen | null
    }): void => {
      if (listen === null || play_id === 0 || play_id === recorded_play_id) return
      if (played_seconds < required_listen_seconds({ duration_seconds, threshold_seconds })) return
      recorded_play_id = play_id
      // Audio comes from the node, so a play always has one; without it
      // there is nowhere to keep or send the listen.
      const node_key = get_node_key()
      if (node_key === null) return
      const captured: CapturedListen = { ...listen, client_listen_id: mint_id(), listened_at_ms: now() }
      write_pending(node_key, [...read_pending(node_key), captured])
      send(node_key, captured)
    },
    flush_pending: (): void => {
      const node_key = get_node_key()
      if (node_key === null) return
      for (const listen of read_pending(node_key)) send(node_key, listen)
    },
    pending_count: (): number => {
      const node_key = get_node_key()
      return node_key === null ? 0 : read_pending(node_key).length
    }
  }
}
