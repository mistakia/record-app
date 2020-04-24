import { List } from 'immutable'

import { ITEMS_PER_LOAD, LISTENS_TRACKLIST_ADDRESS } from '@core/constants'
import { trackActions } from '@core/tracks'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'
import { logActions } from '@core/logs'
import { mergeList } from '@core/utils'
import { listensActions } from '@core/listens'

export function tracklistReducer (state = new Tracklist(), {payload, type}) {
  switch (type) {
    case tracklistActions.CLEAR_SEARCH:
      return state.withMutations(tracklist => {
        tracklist.merge({
          query: null,
          filteredTrackIds: new List()
        })
      })

    case tracklistActions.SEARCH_TRACKS:
      return state.withMutations(tracklist => {
        const { query } = payload
        tracklist.merge({ query, filteredTrackIds: new List() })
      })

    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case listensActions.FETCH_LISTENS_FULFILLED:
      const hasQuery = !!state.get('query')
      const isFiltered = hasQuery || state.tags.size
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          hasMore: hasQuery ? false : payload.data.length === ITEMS_PER_LOAD,
          filteredTrackIds: isFiltered ? mergeList(tracklist.filteredTrackIds, payload.data) : tracklist.filteredTrackIds,
          trackIds: !isFiltered ? mergeList(tracklist.trackIds, payload.data) : tracklist.trackIds
        })
      })

    case listensActions.POST_LISTEN_FULFILLED:
      const { trackId } = payload.data
      return state.merge({
        isUpdating: false,
        trackIds: state.trackIds.unshift(trackId)
      })

    case tracklistActions.TOGGLE_TAG:
      const { tag } = payload
      return state.withMutations(tracklist => {
        tracklist.merge({
          filteredTrackIds: new List(),
          tags: state.tags.includes(tag)
            ? state.tags.splice(state.tags.indexOf(tag), 1)
            : state.tags.push(tag)
        })
      })

    case tracklistActions.POST_TRACK_FULFILLED:
    case trackActions.TRACK_ADDED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: mergeList(tracklist.trackIds, [payload.data])
        })
      })

    case logActions.LOG_INDEX_UPDATED:
      const trackEntries = payload.data.filter(entry => entry.payload.value.type === 'track')
      if (!trackEntries.length) {
        return state
      }

      const tracks = trackEntries.map(entry => entry.payload.value)

      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: mergeList(tracklist.trackIds, tracks)
        })
      })

    case listensActions.POST_LISTEN_PENDING:
    case tracklistActions.POST_TRACK_PENDING:
      return state.set('isUpdating', true)

    case listensActions.FETCH_LISTENS_PENDING:
    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set('isPending', true)

    case listensActions.LOAD_LISTENS:
      return state.merge({
        address: LISTENS_TRACKLIST_ADDRESS
      })

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        address: payload.logAddress,
        query: payload.query,
        tags: payload.tags ? new List(payload.tags) : new List()
      })

    default:
      return state
  }
}
