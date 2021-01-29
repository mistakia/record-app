import { Map, List } from 'immutable'

import { tracklistActions } from '@core/tracklists'
import { taglistActions } from '@core/taglists'
import { createTrack } from './track'
import { trackActions } from './actions'
import { logActions } from '@core/logs'
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

    case logActions.LOG_INDEX_UPDATED:
      if (!payload.data || !payload.data.length) {
        return state
      }

      return state.withMutations(tracks => {
        payload.data.forEach(entry => {
          if (entry.payload.value.type === 'track') {
            const track = entry.payload.value
            tracks.set(track.id, createTrack(track))
          }
        })
      })

    case importerActions.IMPORTER_PROCESSED_FILE:
      return state.withMutations(tracks => {
        tracks.set(payload.track.id, createTrack(payload.track))
      })

    case tracklistActions.ADD_TRACK: {
      if (!payload.data.cid) {
        return state
      }

      return state.withMutations(tracks => {
        tracks.map(track => {
          if (track.contentCID === payload.data.cid) {
            tracks.updateIn([track.id], t => t.merge({ isUpdating: true }))
          }
        })
      })
    }

    case tracklistActions.REMOVE_TRACK:
      return state.withMutations(tracks => {
        tracks.updateIn([payload.data.trackId], t => t.merge({ isUpdating: true }))
      })

    case taglistActions.POST_TAG_FULFILLED:
    case taglistActions.DELETE_TAG_FULFILLED: {
      const { id, tags } = payload.data
      return state.withMutations(tracks => {
        tracks.map(track => {
          tracks.updateIn([id], t => t.merge({ tags: new List(tags) }))
          if (type === taglistActions.POST_TAG_FULFILLED) {
            tracks.updateIn([id], t => t.merge({ haveTrack: true }))
          }
        })
      })
    }

    case tracklistActions.DELETE_TRACK_FULFILLED:
      return state.updateIn([payload.data.trackId], t => t.merge({ isUpdating: false, haveTrack: false }))

    case tracklistActions.POST_TRACK_FULFILLED:
      return state.updateIn([payload.data.id], t => t.merge({ isUpdating: false, haveTrack: true }))

    case listensActions.POST_LISTEN_FULFILLED: {
      const { trackId, timestamps } = payload.data
      if (!state.has(trackId)) {
        return state
      }

      return state.withMutations(tracks => {
        tracks.updateIn([trackId], t => t.merge({ listens: new List(timestamps) }))
      })
    }

    default:
      return state
  }
}
