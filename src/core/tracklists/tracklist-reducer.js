import { List } from 'immutable'

import { ITEMS_PER_LOAD } from '@core/constants'
import { trackActions } from '@core/tracks'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'

export function tracklistReducer (state = new Tracklist(), {payload, type}) {
  switch (type) {
    case tracklistActions.CLEAR_SEARCH:
      return state.withMutations(tracklist => {
        tracklist.merge({
          query: null,
          searchTrackIds: new List()
        })
      })

    case tracklistActions.SEARCH_TRACKS:
      return state.withMutations(tracklist => {
        const { query } = payload
        tracklist.merge({ query })
      })

    case tracklistActions.SEARCH_TRACKS_FULFILLED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          hasMore: false,
          searchTrackIds: new List(payload.data.map(t => t.id))
        })
      })

    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          hasMore: payload.data.length === ITEMS_PER_LOAD,
          trackIds: mergeTrackIds(tracklist.trackIds, payload.data)
        })
      })

    case tracklistActions.FETCH_TRACK_FULFILLED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          trackIds: mergeTrackIds(tracklist.trackIds, payload.data)
        })
      })

    case trackActions.TRACK_ADDED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: mergeTrackIds(tracklist.trackIds, [payload.track.payload.value])
        })
      })

    case tracklistActions.SEARCH_TRACKS_PENDING:
    case tracklistActions.FETCH_TRACKS_PENDING:
    case tracklistActions.FETCH_TRACK_PENDING:
      return state.set('isPending', true)

    case tracklistActions.LOAD_TRACKS:
      return state.set('id', payload.logId)

    default:
      return state
  }
}

// TODO: merge with mergeContactIds
function mergeTrackIds (trackIds, collection) {
  let ids = trackIds.toJS()
  let newIds = collection.reduce((list, trackData) => {
    if (ids.indexOf(trackData.id) === -1) list.push(trackData.id)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : trackIds
}
