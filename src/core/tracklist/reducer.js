import { List } from 'immutable'

import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'

export function tracklistReducer(state = new Tracklist(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracklist => {
	tracklist.merge({
	  isPending: false,
	  isLoaded: true,
	  trackIds: mergeTrackIds(tracklist.trackIds, payload)
	})
      })

    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set('isPending', true)

    case tracklistActions.LOAD_TRACKS:
      return new Tracklist()

    default:
      return state

  }
}

function mergeTrackIds(trackIds, collection) {
  let ids = trackIds.toJS()
  let newIds = collection.reduce((list, trackData) => {
    if (ids.indexOf(trackData.key) === -1) list.push(trackData.key)
    return list
  }, [])

  return newIds.length ? new List(ids.concat(newIds)) : trackIds
}
