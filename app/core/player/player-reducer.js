import { Record, List } from 'immutable'
import { PLAYER_INITIAL_VOLUME, ITEMS_PER_LOAD } from '@core/constants'
import { playerActions } from './actions'
import { mergeList } from '@core/utils'

import { Tracklist } from '@core/tracklists'

export const PlayerState = new Record({
  isPlaying: false,
  isLoading: true,
  repeat: 0,
  isPlayingFromQueue: false,
  isShuffling: false,
  trackId: null,
  history: new List(),
  tracklist: new Tracklist(),
  tracklistAddress: null,
  tracklistCursorId: null,
  tracklistStartIndex: null,
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
      return state
        .mergeIn(['tracklist', 'hasMore'], payload.data.length === ITEMS_PER_LOAD)
        .mergeIn(['tracklist', 'trackIds'], mergeList(state.tracklist.trackIds, payload.data))

    case playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED:
      return state.merge({
        trackId: payload.data[0].id
      }).mergeIn(['tracklist', 'trackIds'], mergeList(state.tracklist.trackIds, payload.data.slice(1)))

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
        tracklist: payload.tracklist,
        tracklistCursorId: null,
        tracklistAddress: payload.tracklistAddress
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

    case playerActions.REORDER_PLAYER_TRACKLIST: {
      const { oldIndex, newIndex } = payload
      const trackId = state.tracklist.trackIds.get(oldIndex)
      return state.mergeIn(['tracklist', 'trackIds'], state.tracklist.trackIds.delete(oldIndex).insert(newIndex, trackId))
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

    case playerActions.PLAY_NEXT:
    case playerActions.PLAY_TRACK: {
      const fromQueue = state.queue.first() === payload.trackId
      const { isShuffling } = state
      const cancelRepeat = state.repeat === 1 && playerActions.PLAY_NEXT === type
      return state.merge({
        repeat: cancelRepeat ? 2 : state.repeat,
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
        trackId: payload.trackId,
        tracklistCursorId: fromQueue || isShuffling ? state.tracklistCursorId : payload.trackId,
        isPlayingFromQueue: fromQueue,
        queue: fromQueue ? state.queue.shift() : state.queue,
        isLoading: true
      }).mergeIn(['tracklist', 'trackIds'], isShuffling
        ? state.get('tracklist').get('trackIds').shift()
        : new List()
      )
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

    case playerActions.PLAY_PLAYER_TRACKLIST_TRACK: {
      const { index } = payload
      const base = state.isShuffling ? 0 : (state.tracklist.trackIds.indexOf(state.tracklistCursorId) + 1)
      const trackId = state.tracklist.trackIds.get(base + index)
      return state.merge({
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
        trackId,
        isPlayingFromQueue: false,
        tracklistCursorId: state.isShuffing ? state.tracklistCursorId : trackId,
        isLoading: true
      }).mergeIn(
        ['tracklist', 'trackIds'],
        state.isShuffling ? state.tracklist.trackIds.delete(index) : state.tracklist.trackIds
      )
    }

    case playerActions.PLAY_TRACKLIST:
      return state.merge({
        history: state.trackId ? state.history.unshift(state.trackId) : state.history,
        isLoading: true,
        isShuffling: false,
        isPlayingFromQueue: false,
        repeat: 0,
        tracklistCursorId: payload.trackId,
        tracklistStartIndex: payload.startIndex,
        trackId: payload.trackId,
        tracklist: payload.tracklist,
        tracklistAddress: payload.tracklistAddress
      })

    default:
      return state
  }
}
