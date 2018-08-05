import { Map } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { createTrack } from './track'

export function tracksReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(trackData => {
          tracks.set(trackData._id, createTrack(trackData))
        })
      })

    case taglistActions.POST_TAG_FULFILLED:
    case taglistActions.DELETE_TAG_FULFILLED:
      const track = payload.data
      return state.withMutations(tracks => tracks.set(track._id, createTrack(track)))

    default:
      return state
  }
}
