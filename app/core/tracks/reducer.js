import { Map, List } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { createTrack } from './track'
import { trackActions } from './actions'
import { contactActions } from '@core/contacts'
import { playerActions } from '@core/player'

export function tracksReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case trackActions.CLEAR:
      return state.filter((value, key) => payload.trackIds ? payload.trackIds.contains(key) : false)

    case playerActions.FETCH_PLAYER_TRACKS_FULFILLED:
    case playerActions.FETCH_PLAYER_SHUFFLE_FULFILLED:
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracks => {
        payload.data.forEach(trackData => {
          tracks.set(trackData.id, createTrack(trackData))
        })
      })

    case trackActions.TRACK_ADDED:
      return state.withMutations(tracks => {
        const track = tracks.get(payload.data.id)
        if (track) {
          return
        }
        tracks.set(payload.data.id, createTrack(payload.data))
      })

    case contactActions.CONTACT_INDEX_UPDATED:
      if (!payload.entry) {
        return state
      }

      return state.withMutations(tracks => {
        tracks.set(payload.entry.id, createTrack(payload.entry))
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
      const { contentCID } = payload.data
      const trackId = payload.data.id
      return state.withMutations(tracks => {
        tracks.setIn([trackId, 'isUpdating'], false)
        tracks.map(track => {
          if (track.contentCID === contentCID) {
            tracks.setIn([track.id, 'haveTrack'], true)
          }
        })
      })
    }

    default:
      return state
  }
}
