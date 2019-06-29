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

    case tracklistActions.ADD_TRACK:
      return state.withMutations(tracks => {
        tracks.map(track => {
          if (track.contentCID === payload.data.cid) {
            tracks.setIn([track.id, 'isUpdating'], true)
          }
        })
      })

    case tracklistActions.REMOVE_TRACK:
      return state.withMutations(tracks => {
        tracks.setIn([payload.data.trackId, 'isUpdating'], true)
      })

    case taglistActions.POST_TAG_FULFILLED:
    case taglistActions.DELETE_TAG_FULFILLED:
      const track = payload.data
      return state.withMutations(tracks => tracks.set(track._id, createTrack(track)))

    case tracklistActions.DELETE_TRACK_FULFILLED:
      return state.withMutations(tracks => {
        const track = tracks.get(payload.data.trackId)
        const contentCID = track.get('contentCID')
        tracks.setIn([payload.data.trackId, 'isUpdating'], false)
        tracks.map(track => {
          if (track.contentCID === contentCID) {
            tracks.setIn([track.id, 'haveTrack'], false)
          }
        })
      })

    case tracklistActions.POST_TRACK_FULFILLED:
      const { contentCID } = payload.data.payload.value
      const trackId = payload.data.payload.value._id
      return state.withMutations(tracks => {
        tracks.setIn([trackId, 'isUpdating'], false)
        tracks.map(track => {
          if (track.contentCID === contentCID) {
            tracks.setIn([track.id, 'haveTrack'], true)
          }
        })
      })

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
