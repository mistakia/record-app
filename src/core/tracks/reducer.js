import { Map, List } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { feedActions } from '@core/feed'
import { createTrack } from './track'
import { trackActions } from './actions'

export function tracksReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case trackActions.CLEAR:
      return state.filter((value, key) => key === payload.trackId)

    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACK_FULFILLED:
    case tracklistActions.SEARCH_TRACKS_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(trackData => {
          tracks.set(trackData.id, createTrack(trackData))
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
    case taglistActions.DELETE_TAG_FULFILLED: {
      const { id, tags } = payload.data
      return state.withMutations(tracks => {
        tracks.map(track => {
          tracks.setIn([id, 'tags'], new List(tags))
          if (type === taglistActions.POST_TAG_FULFILLED) {
            tracks.setIn([id, 'haveTrack'], true)
          }
        })
      })
    }

    case tracklistActions.DELETE_TRACK_FULFILLED: {
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
    }

    case tracklistActions.POST_TRACK_FULFILLED: {
      const { contentCID } = payload.data.payload.value
      const trackId = payload.data.payload.value.id
      return state.withMutations(tracks => {
        tracks.setIn([trackId, 'isUpdating'], false)
        tracks.map(track => {
          if (track.contentCID === contentCID) {
            tracks.setIn([track.id, 'haveTrack'], true)
          }
        })
      })
    }

    case feedActions.FETCH_FEED_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(feedData => {
          if (feedData.entryType === 'track') {
            tracks.set(feedData.content.id, createTrack(feedData.content))
          }
        })
      })

    default:
      return state
  }
}
