// The inline adder's writes. An added tag shows at once (optimistic) and
// stays only if the node took it for at least one track; a refusal rolls it
// back, report_write having said why. Adds and removals run one at a time in
// the order made, so each answer is the newest state of its track.

import { useRef, useState } from 'react'

import type { Track } from '#renderer/api/types.ts'
import { target_fields, type WriteTarget } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write } from '#renderer/store/write.ts'

export interface ShownTag {
  tag: string
  library_address: string
}

export const tag_key = ({ tag, library_address }: ShownTag): string => `${library_address} ${tag}`

export const use_tag_writes = ({ initial, on_added }: { initial: Track[], on_added: (target: WriteTarget) => void }) => {
  const dispatch = use_app_dispatch()
  const [tracks, set_tracks] = useState(initial)
  const [pending, set_pending] = useState<ShownTag[]>([])
  // Tagging several tracks: the tags added here, since the rows are not shown.
  const [added, set_added] = useState<ShownTag[]>([])
  const [fresh, set_fresh] = useState<ReadonlySet<string>>(new Set())
  const queue = useRef<Promise<void>>(Promise.resolve())
  const single = tracks.length === 1 ? tracks[0] : undefined

  const settled = single === undefined ? added : single.tags
  const shown: Array<ShownTag & { pending: boolean }> = [
    ...settled.map((entry) => ({ ...entry, pending: false })),
    ...pending.filter((entry) => !settled.some((done) => tag_key(done) === tag_key(entry))).map((entry) => ({ ...entry, pending: true }))
  ]

  const enqueue = (job: () => Promise<void>) => {
    queue.current = queue.current.then(job).catch(() => {})
  }

  const replace = (track: Track) => {
    set_tracks((current) => current.map((each) => each.id === track.id ? track : each))
  }

  const unfresh = (key: string) => {
    set_fresh((current) => {
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }

  const add = (tag: string, target: WriteTarget) => {
    const entry = { tag, library_address: target.library_address }
    const key = tag_key(entry)
    if (shown.some((each) => tag_key(each) === key)) return
    set_pending((current) => [...current, entry])
    set_fresh((current) => new Set(current).add(key))
    enqueue(async () => {
      let took = 0
      for (const { id, tags } of initial) {
        // A track that already carries the tag there needs no write (the node would refuse it).
        if (tags.some((each) => tag_key(each) === key)) {
          took++
          continue
        }
        const result = await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.add_tag.initiate({ track_id: id, tag, ...target_fields(target) })), success: null })
        if (result.ok) {
          took++
          replace(result.data)
        }
      }
      if (took > 0 && initial.length > 1) set_added((current) => [...current, entry])
      set_pending((current) => current.filter((each) => tag_key(each) !== key))
      if (took === 0) unfresh(key)
      else on_added(target)
      if (took > 0 && initial.length > 1) dispatch(notified({ kind: 'info', message: `Tagged ${took} tracks ${tag}.` }))
    })
  }

  const remove = (entry: ShownTag) => {
    if (single === undefined) return
    enqueue(async () => {
      const result = await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.remove_tag.initiate({ track_id: single.id, ...entry })), success: null })
      if (result.ok) replace(result.data)
    })
  }

  return { tracks, single, shown, fresh, add, remove, unfresh }
}
