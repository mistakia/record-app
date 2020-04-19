import { Map } from 'immutable'

import { tracklistActions } from './actions'
import { tracklistReducer } from './tracklist-reducer'
import { trackActions } from '@core/tracks'
import { taglistActions } from '@core/taglists'
import { contactActions } from '@core/contacts'

export const initialState = new Map({
  currentTracklistId: null,
  pendingTrackCID: null
})

export function tracklistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case tracklistActions.CLEAR_SEARCH:
    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACKS_PENDING:
    case tracklistActions.POST_TRACK_PENDING:
      return state.set(
        payload.logId,
        tracklistReducer(state.get(payload.logId), action)
      )

    case trackActions.TRACK_ADDED:
      return state.set(
        payload.logId,
        tracklistReducer(state.get(payload.logId), action)
      )

    case contactActions.CONTACT_INDEX_UPDATED:
      if (!payload.data || !payload.data.length) {
        return state
      }

      return state.set(
        payload.logId,
        tracklistReducer(state.get(payload.logId), action)
      )

    case tracklistActions.SEARCH_TRACKS:
    case tracklistActions.TOGGLE_TAG:
      const logId = state.get('currentTracklistId')
      return state.merge({
        [logId]: tracklistReducer(state.get(logId), action)
      })

    case tracklistActions.ADD_TRACK:
    case taglistActions.ADD_TAG:
      return state.set('pendingTrackCID', action.payload.data.cid)

    case tracklistActions.POST_TRACK_FAILED:
    case tracklistActions.POST_TRACK_FULFILLED:
    case taglistActions.POST_TAG_FAILED:
    case taglistActions.POST_TAG_FULFILLED:
      state.set('pendingTrackCID', null)
      return state.setIn([payload.logId, 'isUpdating'], false)

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        currentTracklistId: payload.logId,
        [payload.logId]: tracklistReducer(undefined, action)
      })

    default:
      return state
  }
}
