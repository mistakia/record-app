// The inline adder's writes (tag-writes.ts) bound to the node API and the
// toasts: report_write says why a write was refused.

import { useState, useSyncExternalStore } from 'react'

import { create_tag_writes, shown_tags } from './tag-writes.ts'
import type { Track } from '#renderer/api/types.ts'
import { target_fields } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write } from '#renderer/store/write.ts'

export const use_tag_writes = (initial: Track[]) => {
  const dispatch = use_app_dispatch()
  const [writes] = useState(() => create_tag_writes<Track>({
    initial,
    add_tag: async ({ track_id, tag, target }) => await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.add_tag.initiate({ track_id, tag, ...target_fields(target) })), success: null }),
    remove_tag: async (query) => await report_write<Track>({ dispatch, write: dispatch(node_api.endpoints.remove_tag.initiate(query)), success: null }),
    notify: (message) => { dispatch(notified({ kind: 'info', message })) }
  }))
  const state = useSyncExternalStore(writes.subscribe, writes.get)
  return {
    tracks: state.tracks,
    single: state.tracks.length === 1 ? state.tracks[0] : undefined,
    shown: shown_tags(state),
    fresh: state.fresh,
    add: writes.add,
    remove: writes.remove,
    unfresh: writes.unfresh
  }
}
