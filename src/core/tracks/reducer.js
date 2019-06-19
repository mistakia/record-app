import { Map } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { feedActions } from '@core/feed'
import { createTrack } from './track'

export function tracksReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACK_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(trackData => {
          tracks.set(trackData._id, createTrack(trackData))
        })
      })

    case taglistActions.POST_TAG_FULFILLED:
    case taglistActions.DELETE_TAG_FULFILLED:
      const track = payload.data
      return state.withMutations(tracks => tracks.set(track._id, createTrack(track)))

    case feedActions.FETCH_FEED_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(feedData => {
          if (feedData.entryType === 'track') {
            tracks.set(feedData.content._id, createTrack(feedData.content))
          }
        })
      })

    default:
      return state
  }
}
