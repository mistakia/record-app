import { Record, List } from 'immutable'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { playerActions } from './actions'
import { mergeList } from '@core/utils'

export const PlayerState = new Record({
  isPlaying: false,
  isLoading: true,
  repeat: 0,
  isPlayingFromQueue: false,
  isShuffling: false,
  trackId: null,
  history: new List(),
  tracklistAddress: null,
  tracklistCursorId: null,
  tracklistTrackIds: new List(),
  tracklistTags: new List(),
  tracklistStartIndex: null,
  tracklistHasMore: true,
  tracklistQuery: null,
  shuffleTrackIds: new List(),
  isQueueVisible: false,
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

    case playerActions.TOGGLE_PLAY_REPEAT:
      const repeat = state.repeat + 1
      return state.merge({
        repeat: repeat > 2 ? 0 : repeat
      })

    case playerActions.TOGGLE_QUEUE:
      return state.merge({
        isQueueVisible: !state.isQueueVisible
      })

    case playerActions.FETCH_PLAYER_TRACKS_FULFILLED:
      return state.merge({
        tracklistHasMore: payload.data.length === ITEMS_PER_LOAD,
        tracklistTrackIds: mergeList(state.tracklistTrackIds, payload.data)
      })

    case playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED:
      return state.merge({
        trackId: payload.data[0].id,
        shuffleTrackIds: mergeList(state.shuffleTrackIds, payload.data.slice(1))
      })

    case playerActions.AUDIO_VOLUME_CHANGED:
      return state.set('volume', payload.volume)

    case playerActions.STOP_SHUFFLE:
      return state.merge({
        isShuffling: false,
        shuffleTrackIds: new List()
      })

    case playerActions.SHUFFLE_TRACKLIST:
      return state.merge({
        isShuffling: true,
        isPlayingFromQueue: false,
        isLoading: true,
        tracklistTrackIds: new List(),
        tracklistCursorId: null,
        tracklistAddress: payload.tracklistAddress,
        tracklistTags: payload.tags,
        tracklistQuery: payload.query
      })

    case playerActions.CLEAR_QUEUE: {
      return state.merge({
        queue: new List()
      })
    }

    case playerActions.REORDER_QUEUE: {
      const { oldIndex, newIndex } = payload
      const trackId = state.queue.get(oldIndex)
      return state.merge({
        queue: state.queue.delete(oldIndex).insert(newIndex, trackId)
      })
    }

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

    case playerActions.PLAY_PREVIOUS: {
      const { trackId, tracklistPreviousTrackId } = payload
      return state.merge({
        history: state.history.shift(),
        trackId,
        tracklistCursorId: tracklistPreviousTrackId || state.tracklistCursorId,
        isLoading: true
      })
    }

    case playerActions.PLAY_TRACK: {
      const fromQueue = state.queue.first() === payload.trackId
      const { isShuffling } = state
      const cancelRepeat = state.repeat === 1 &&
        (state.trackId === state.tracklistTrackIds.last() && payload.trackId === state.tracklistTrackIds.first())
      return state.merge({
        repeat: cancelRepeat ? 0 : state.repeat,
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
        trackId: payload.trackId,
        tracklistCursorId: fromQueue || isShuffling ? state.tracklistCursorId : payload.trackId,
        isPlayingFromQueue: fromQueue,
        queue: fromQueue ? state.queue.shift() : state.queue,
        shuffleTrackIds: isShuffling ? state.shuffleTrackIds.shift() : new List(),
        isLoading: true
      })
    }

    case playerActions.PLAY_QUEUE_TRACK: {
      const { queueIndex } = payload
      const trackId = state.queue.get(queueIndex)
      return state.merge({
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
        trackId,
        isPlayingFromQueue: true,
        isLoading: true,
        queue: state.queue.delete(queueIndex)
      })
    }

    case playerActions.PLAY_TRACKLIST:
      return state.merge({
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
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
        tracklistAddress: payload.tracklistAddress || state.get('tracklistAddress')
      })

    default:
      return state
  }
}
