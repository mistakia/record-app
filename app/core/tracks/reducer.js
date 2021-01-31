import { Map, List } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { createTrack } from './track'
import { trackActions } from './actions'
import { playerActions } from '@core/player'
import { listensActions } from '@core/listens'
import { importerActions } from '@core/importer'

export function tracksReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case trackActions.CLEAR:
      return state.filter((value, key) => payload.trackIds ? payload.trackIds.contains(key) : false)

    case listensActions.FETCH_LISTENS_FULFILLED:
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

    case importerActions.IMPORTER_PROCESSED_FILE:
      return state.withMutations(tracks => {
        tracks.set(payload.track.id, createTrack(payload.track))
      })

    case tracklistActions.ADD_TRACK: {
      if (!payload.data.cid) {
        return state
      }

      const track = state.find(t => t.contentCID === payload.data.cid)
      return state.setIn([track.id, 'isUpdating'], true)
    }

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

    case tracklistActions.DELETE_TRACK_FAILED:
    case tracklistActions.POST_TRACK_FAILED: {
      // TODO
      return state
    }

    case tracklistActions.DELETE_TRACK_FULFILLED:
      return state.mergeIn([payload.data.trackId], { isUpdating: false, haveTrack: false })

    case tracklistActions.POST_TRACK_FULFILLED:
      return state.mergeIn([payload.data.id], { isUpdating: false, haveTrack: true })

    case listensActions.POST_LISTEN_FULFILLED: {
      const { trackId, timestamps } = payload.data
      if (!state.has(trackId)) {
        return state
      }

      return state.withMutations(tracks => {
        tracks.setIn([trackId, 'listens'], new List(timestamps))
      })
    }

    default:
      return state
  }
}
