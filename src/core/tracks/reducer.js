import { Map } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { createTrack } from './track'


export function tracksReducer(state = new Map(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(trackData => {
          tracks.set(trackData._id, createTrack(trackData))
        })
      })

    default:
      return state
  }
}
