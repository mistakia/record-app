import { List } from 'immutable'

import { appActions } from '@core/app'
import { ITEMS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'

export function tracklistReducer (state = new Tracklist(), {payload, type}) {
  switch (type) {
    case appActions.INIT_APP:
      return state.set('id', payload.address)

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
    if (ids.indexOf(trackData._id) === -1) list.push(trackData._id)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : trackIds
}
