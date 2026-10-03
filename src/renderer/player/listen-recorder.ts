// Listen recording (spec §8.9.1): one listen per play once it has been
// heard for the threshold (60 s), counted in played context time, so pauses
// and seeks neither add nor skip time. A track shorter than the threshold
// counts once played to within a second of its end. A listen the node could
// not take yet (writes gated while stale, or the node unreachable) waits and
// is retried by flush_pending.

export const LISTEN_THRESHOLD_SECONDS = 60
const MAX_PENDING = 100

export interface Listen {
  track_id: string
  library_address: string
}

export const required_listen_seconds = ({ duration_seconds, threshold_seconds = LISTEN_THRESHOLD_SECONDS }: {
  duration_seconds: number
  threshold_seconds?: number
}): number => duration_seconds > 0 ? Math.min(threshold_seconds, Math.max(duration_seconds - 1, 0)) : threshold_seconds

export const create_listen_recorder = ({ record, threshold_seconds = LISTEN_THRESHOLD_SECONDS }: {
  // Resolves true when the node took the listen, or when retrying would not
  // help; false to keep it for a retry.
  record: (listen: Listen) => Promise<boolean>
  threshold_seconds?: number
}) => {
  let recorded_play_id = 0
  let pending: Listen[] = []

  const send = (listen: Listen): void => {
    record(listen)
      .then((taken) => {
        if (!taken) pending = [...pending, listen].slice(-MAX_PENDING)
      })
      .catch(() => { pending = [...pending, listen].slice(-MAX_PENDING) })
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
      send(listen)
    },
    flush_pending: (): void => {
      const waiting = pending
      pending = []
      for (const listen of waiting) send(listen)
    },
    pending_count: (): number => pending.length
  }
}
