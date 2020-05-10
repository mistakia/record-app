import { Map } from 'immutable'

import { LISTENS_TRACKLIST_ADDRESS } from '@core/constants'
import { tracklistActions } from './actions'
import { tracklistReducer } from './tracklist-reducer'
import { trackActions } from '@core/tracks'
import { taglistActions } from '@core/taglists'
import { logActions } from '@core/logs'
import { listensActions } from '@core/listens'
import { importerActions } from '@core/importer'

export const initialState = new Map({
  currentTracklistAddress: null
})

export function tracklistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case tracklistActions.CLEAR_SEARCH:
    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACKS_PENDING:
    case tracklistActions.POST_TRACK_PENDING:
      return state.set(
        payload.logAddress,
        tracklistReducer(state.get(payload.logAddress), action)
      )

    case listensActions.POST_LISTEN_FULFILLED:
    case listensActions.POST_LISTEN_FAILED:
    case listensActions.POST_LISTEN_PENDING:
    case listensActions.FETCH_LISTENS_PENDING:
    case listensActions.FETCH_LISTENS_FULFILLED:
    case listensActions.FETCH_LISTENS_FAILED:
      return state.set(
        LISTENS_TRACKLIST_ADDRESS,
        tracklistReducer(state.get(LISTENS_TRACKLIST_ADDRESS), action)
      )

    case importerActions.IMPORTER_PROCESSED_FILE:
      return state.withMutations(state => {
        payload.logAddresses.forEach(logAddress => {
          state.set(logAddress, tracklistReducer(state.get(logAddress), action))
        })
      })

    case trackActions.TRACK_ADDED:
      return state.set(
        payload.logAddress,
        tracklistReducer(state.get(payload.logAddress), action)
      )

    case logActions.LOG_INDEX_UPDATED:
      if (!payload.data || !payload.data.length) {
        return state
      }

      return state.set(
        payload.logAddress,
        tracklistReducer(state.get(payload.logAddress), action)
      )

    case tracklistActions.SEARCH_TRACKS:
    case tracklistActions.TOGGLE_TAG:
      const logAddress = state.get('currentTracklistAddress')
      return state.merge({
        [logAddress]: tracklistReducer(state.get(logAddress), action)
      })

    case tracklistActions.POST_TRACK_FAILED:
    case tracklistActions.POST_TRACK_FULFILLED:
    case taglistActions.POST_TAG_FAILED:
    case taglistActions.POST_TAG_FULFILLED:
      return state.setIn([payload.logAddress, 'isUpdating'], false)

    case listensActions.LOAD_LISTENS:
      return state.merge({
        currentTracklistAddress: LISTENS_TRACKLIST_ADDRESS,
        [LISTENS_TRACKLIST_ADDRESS]: tracklistReducer(undefined, action)
      })

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        currentTracklistAddress: payload.logAddress,
        [payload.logAddress]: tracklistReducer(undefined, action)
      })

    default:
      return state
  }
}
