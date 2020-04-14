import { Record, List } from 'immutable'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { playerActions } from './actions'
import { mergeIds } from '@core/utils'

export const PlayerState = new Record({
  isPlaying: false,
  isLoading: true,
  isPlayingFromQueue: false,
  isShuffling: false,
  trackId: null,
  tracklistId: null,
  tracklistCursorId: null,
  tracklistTrackIds: new List(),
  tracklistTags: new List(),
  tracklistStartIndex: null,
  tracklistHasMore: true,
  tracklistQuery: null,
  shuffleTrackIds: new List(),
  queue: new List(),
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

    case playerActions.FETCH_PLAYER_TRACKS_FULFILLED:
      return state.merge({
        tracklistHasMore: payload.data.length === ITEMS_PER_LOAD,
        tracklistTrackIds: mergeIds(state.tracklistTrackIds, payload.data)
      })

    case playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED:
      return state.merge({
        trackId: payload.data[0].id,
        shuffleTrackIds: mergeIds(state.shuffleTrackIds, payload.data.slice(1))
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
        tracklistTrackIds: new List(),
        tracklistCursorId: null,
        tracklistId: payload.tracklistId,
        tracklistTags: payload.tags,
        tracklistQuery: payload.query
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

    case playerActions.PLAY_TRACK:
      const fromQueue = state.queue.first() === payload.trackId
      const { isShuffling } = state
      return state.merge({
        trackId: payload.trackId,
        tracklistCursorId: fromQueue || isShuffling ? state.tracklistCursorId : payload.trackId,
        isPlayingFromQueue: fromQueue,
        queue: fromQueue ? state.queue.shift() : state.queue,
        shuffleTrackIds: isShuffling ? state.shuffleTrackIds.shift() : new List(),
        isLoading: true
      })

    case playerActions.PLAY_TRACKLIST:
      return state.merge({
        isLoading: true,
        isShuffling: false,
        isPlayingFromQueue: false,
        shuffleTrackIds: new List(),
        tracklistCursorId: payload.trackId,
        tracklistTrackIds: payload.trackIds,
        tracklistTags: payload.tags,
        tracklistStartIndex: payload.startIndex,
        tracklistHasMore: payload.hasMore,
        tracklistQuery: payload.query,
        trackId: payload.trackId,
        tracklistId: payload.tracklistId || state.get('tracklistId')
      })

    default:
      return state
  }
}
