// Player state for components, and the Media Session bridge: the OS sees
// what the store holds, and its controls call the same player-controller
// functions as the player bar.

import { useEffect } from 'react'
import { useStore } from 'react-redux'

import { install_media_session } from '#renderer/player/media-session.ts'
import {
  next_track,
  pause_playback,
  previous_track,
  resume_playback,
  seek_playback,
  stop_playback
} from '#renderer/player/player-controller.ts'
import { current_entry } from '#renderer/player/queue-manager.ts'
import { use_app_selector, type RootState } from '#renderer/store/index.ts'

export const use_player = () => {
  const player = use_app_selector((state) => state.player)
  return { player, current: current_entry(player.queue) }
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
      const { player } = store.getState()
      const entry = current_entry(player.queue)
      const state = {
        title: entry?.title ?? null,
        artist: entry?.artist ?? null,
        playing: player.state === 'playing' || player.state === 'loading',
        has_track: entry !== null,
        position_seconds: player.position_seconds,
        duration_seconds: player.duration_seconds || (entry?.duration_seconds ?? 0)
      }
      const key = JSON.stringify(state)
      if (key === last) return
      last = key
      session.update(state)
    }
    update()
    const unsubscribe = store.subscribe(update)
    return () => {
      unsubscribe()
      session.uninstall()
    }
  }, [store])
}
