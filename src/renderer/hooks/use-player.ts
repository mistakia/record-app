// Player state for components, and the Media Session bridge: the OS sees
// what the store holds, and its controls call the same player-controller
// functions as the player bar.

import { createSelector } from '@reduxjs/toolkit'
import { useEffect } from 'react'
import { useStore } from 'react-redux'

import type { Track } from '#renderer/api/types.ts'
import { install_media_session } from '#renderer/player/media-session.ts'
import {
  next_track,
  pause_playback,
  previous_track,
  resume_playback,
  seek_playback,
  stop_playback
} from '#renderer/player/player-controller.ts'
import { cached_image, load_image, subscribe_images } from '#renderer/images/image-cache.ts'
import { track_display, type QueueEntry } from '#renderer/player/queue-manager.ts'
import { node_api } from '#renderer/store/api.ts'
import { freshest_cached_track } from '#renderer/store/cached-track.ts'
import { use_app_selector, type RootState } from '#renderer/store/index.ts'

// Each queue entry as the node now describes its track, so a tag added or a
// title edited while it is queued shows at once in the player bar, the queue
// panel, and the OS, and a queue restored from an older snapshot catches up
// once a page holds its track. Recomputed only when the cache or the queue
// changes, not on every position tick; an entry whose track no page holds
// keeps what it was queued with.
const merged = new WeakMap<QueueEntry, { track: Track, entry: QueueEntry }>()

const fresh_entry = (queries: RootState[typeof node_api.reducerPath]['queries'], entry: QueueEntry): QueueEntry => {
  const track = freshest_cached_track({ queries, track_id: entry.track_id, scope: entry.scope ?? '' })
  if (track === null) return entry
  const known = merged.get(entry)
  if (known?.track === track) return known.entry
  const fresh = { ...entry, ...track_display(track) }
  merged.set(entry, { track, entry: fresh })
  return fresh
}

export const select_fresh_entries = createSelector(
  [(state: RootState) => state[node_api.reducerPath].queries, (state: RootState) => state.player.queue.entries],
  (queries, entries) => entries.map((entry) => fresh_entry(queries, entry))
)

export const use_player = () => {
  const player = use_app_selector((state) => state.player)
  const entries = use_app_selector(select_fresh_entries)
  const current = entries[player.queue.index] ?? null
  return { player, entries, current }
}

export const use_media_session = (): void => {
  const store = useStore<RootState>()

  useEffect(() => {
    const session = install_media_session({
      actions: {
        play: resume_playback,
        pause: pause_playback,
        next: next_track,
        previous: previous_track,
        stop: stop_playback,
        seek_to: seek_playback,
        seek_by: (offset) => { seek_playback(store.getState().player.position_seconds + offset) }
      }
    })
    let last = ''
    const update = (): void => {
      const state_now = store.getState()
      const { player } = state_now
      const entry = select_fresh_entries(state_now)[player.queue.index] ?? null
      const artwork_cid = entry?.artwork ?? null
      const artwork_url = artwork_cid === null ? null : cached_image(artwork_cid)
      if (artwork_cid !== null && artwork_url === undefined) load_image(artwork_cid).catch(() => {})
      const state = {
        artwork: artwork_cid === null || artwork_url == null ? null : { cid: artwork_cid, url: artwork_url },
        title: entry?.title ?? null,
        artist: entry?.artist ?? null,
        playing: player.state === 'playing' || player.state === 'loading',
        has_track: entry !== null,
        position_seconds: player.position_seconds,
        duration_seconds: player.duration_seconds || (entry?.duration_seconds ?? 0)
      }
      const key = JSON.stringify({ ...state, artwork: state.artwork?.cid ?? null })
      if (key === last) return
      last = key
      session.update(state)
    }
    update()
    const unsubscribe = store.subscribe(update)
    const unsubscribe_images = subscribe_images(update)
    return () => {
      unsubscribe()
      unsubscribe_images()
      session.uninstall()
    }
  }, [store])
}
