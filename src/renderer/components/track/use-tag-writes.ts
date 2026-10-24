// The inline adder's writes (tag-writes.ts) bound to the node API and the
// toasts: report_write says why a write was refused. A label write answers
// with the track, or with only the target's labels on it when no library
// the node shows holds the track (chapter 7 LabelWriteResult); those are
// merged into the track as the adder last saw it.

import { useState, useSyncExternalStore } from 'react'

import { create_tag_writes, merge_label_result, shown_tags } from './tag-writes.ts'
import type { LabelWriteResult, Track } from '#renderer/api/types.ts'
import { target_fields, type WriteTarget } from '#renderer/library/write-targets.ts'
import { node_api } from '#renderer/store/api.ts'
import { use_app_dispatch } from '#renderer/store/index.ts'
import { notified } from '#renderer/store/notifications.ts'
import { report_write, type WriteOutcome } from '#renderer/store/write.ts'

const as_track = (outcome: WriteOutcome<LabelWriteResult>, track: Track, target: WriteTarget): WriteOutcome<Track> =>
  outcome.ok ? { ok: true, data: merge_label_result({ track, result: outcome.data, library_address: target.library_address }) } : outcome

export const use_tag_writes = (initial: Track[]) => {
  const dispatch = use_app_dispatch()
  const [writes] = useState(() => create_tag_writes<Track>({
    initial,
    add_tag: async ({ track, tag, target }) => as_track(await report_write<LabelWriteResult>({ dispatch, write: dispatch(node_api.endpoints.add_tag.initiate({ track_id: track.id, tag, ...target_fields(target) })), success: null }), track, target),
    remove_tag: async ({ track, tag, target }) => as_track(await report_write<LabelWriteResult>({ dispatch, write: dispatch(node_api.endpoints.remove_tag.initiate({ track_id: track.id, tag, ...target_fields(target) })), success: null }), track, target),
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
