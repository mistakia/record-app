import { Map } from 'immutable'
import { tracklistActions } from '@core/tracklist'
import { createTrack } from './track'

export function tracksReducer(state = new Map(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracks => {
	payload.forEach(trackData => {
	  tracks.set(trackData.key, createTrack(trackData))
	})
      })

    default:
      return state
  }
}
