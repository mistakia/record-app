import { List } from 'immutable'

import { TRACKS_PER_LOAD } from '@core/constants'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'

export function tracklistReducer (state = new Tracklist(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          isNew: false,
          isPending: false,
          hasMore: payload.data.length === TRACKS_PER_LOAD,
          trackIds: mergeTrackIds(tracklist.trackIds, payload.data)
        })
      })

    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set('isPending', true)

    case tracklistActions.LOAD_TRACKS:
      return state.isNew ? state.set('id', payload.logId) : state

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
