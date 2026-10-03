// In-flight audio downloads by request_id, so the renderer can cancel one,
// and capped: the player needs the current track and the next one, plus one
// being replaced, so a fourth at once is refused rather than queued.
// Imports nothing from Electron.

import type { NodeResult } from '#shared/bridge.ts'

export const MAX_CONCURRENT_AUDIO_DOWNLOADS = 3

export const create_audio_downloads = ({ download, max_concurrent = MAX_CONCURRENT_AUDIO_DOWNLOADS }: {
  download: (input: { cid: string, signal: AbortSignal }) => Promise<NodeResult<ArrayBuffer>>
  max_concurrent?: number
}) => {
  const in_flight = new Map<string, AbortController>()
  return {
    start: async ({ cid, request_id }: { cid: string, request_id: string }): Promise<NodeResult<ArrayBuffer>> => {
      if (in_flight.has(request_id)) return { ok: false, failure: { kind: 'refused', message: 'That audio request id is already in use.' } }
      if (in_flight.size >= max_concurrent) {
        return { ok: false, failure: { kind: 'busy', message: `Already downloading ${max_concurrent} audio files.` } }
      }
      const controller = new AbortController()
      in_flight.set(request_id, controller)
      try {
        return await download({ cid, signal: controller.signal })
      } finally {
        in_flight.delete(request_id)
      }
    },
    cancel: (request_id: string): void => { in_flight.get(request_id)?.abort() },
    count: (): number => in_flight.size
  }
}
