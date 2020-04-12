import { Record, List } from 'immutable'
import { PLAYER_INITIAL_VOLUME } from '@core/constants'
import { tracklistActions } from '@core/tracklists'
import { playerActions } from './actions'

export const PlayerState = new Record({
  isPlaying: false,
  isLoading: true,
  isPlayingFromQueue: false,
  trackId: null,
  tracklistCursorId: null,
  queue: new List(),
  isShuffling: false,
  tracklistId: null,
  volume: PLAYER_INITIAL_VOLUME
})

export function playerReducer (state = new PlayerState(), {payload, type}) {
  switch (type) {
    case playerActions.AUDIO_ENDED:
    case playerActions.AUDIO_PAUSED:
      return state.set('isPlaying', false)

    case playerActions.AUDIO_PLAYING:
      return state.merge({
        isPlaying: true,
        isLoading: false
      })

    case playerActions.AUDIO_VOLUME_CHANGED:
      return state.set('volume', payload.volume)

    case playerActions.STOP_SHUFFLE:
      return state.merge({
        isShuffling: false
      })

    case playerActions.SHUFFLE_TRACKLIST:
      return state.merge({
        isShuffling: true,
        isPlayingFromQueue: false,
        isLoading: true,
        tracklistId: payload.tracklistId
      })

    case tracklistActions.FETCH_TRACK_FULFILLED:
      if (!payload.data.length) {
        return state
      }

      const trackId = payload.data[0].id
      return state.merge({
        trackId
      })

    case playerActions.QUEUE_TRACK:
      return state.merge({
        queue: payload.playNext
          ? state.queue.unshift(payload.trackId)
          : state.queue.push(payload.trackId)
      })

    case playerActions.UNQUEUE_TRACK:
      return state.merge({
        queue: payload.queueIndex
          ? state.queue.remove(payload.queueIndex)
          : state.queue.filter(trackId => trackId !== payload.trackId)
      })

    case playerActions.PLAY_NEXT_TRACK:
      const fromQueue = state.queue.first() === payload.trackId
      return state.merge({
        trackId: payload.trackId,
        tracklistCursorId: fromQueue ? state.tracklistCursorId : payload.trackId,
        isPlayingFromQueue: fromQueue,
        queue: fromQueue ? state.queue.shift() : state.queue,
        isLoading: true
      })

    case playerActions.PLAY_SELECTED_TRACK:
      return state.merge({
        isLoading: true,
        isShuffling: false,
        isPlayingFromQueue: false,
        tracklistCursorId: payload.trackId,
        trackId: payload.trackId,
        tracklistId: payload.tracklistId || state.get('tracklistId')
      })

    default:
      return state
  }
}
