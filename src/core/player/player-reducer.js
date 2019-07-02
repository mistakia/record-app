import { Record } from 'immutable'
import { PLAYER_INITIAL_VOLUME, SESSION_TRACKLIST_ID } from '@core/constants'
import { tracklistActions } from '@core/tracklists'
import { playerActions } from './actions'

export const PlayerState = new Record({
  isPlaying: false,
  isLoading: true,
  isFullscreen: false,
  trackId: null,
  isShuffling: false,
  tracklistId: SESSION_TRACKLIST_ID,
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

    case playerActions.SHUFFLE_TRACKLIST:
      return state.merge({
        isShuffling: true,
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

    case playerActions.PLAY_SELECTED_TRACK:
      return state.merge({
        isLoading: true,
        isShuffling: false,
        trackId: payload.trackId,
        tracklistId: payload.tracklistId || state.get('tracklistId')
      })

    case playerActions.TOGGLE_FULLSCREEN:
      return state.set('isFullscreen', !state.isFullscreen)

    default:
      return state
  }
}
