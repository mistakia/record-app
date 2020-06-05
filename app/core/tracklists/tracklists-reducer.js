import { Map } from 'immutable'

import {
  CURRENT_TRACKLIST_ADDRESS
} from '@core/constants'
import { tracklistActions } from './actions'
import { tracklistReducer } from './tracklist-reducer'
import { Tracklist } from './tracklist'
import { trackActions } from '@core/tracks'
import { logActions } from '@core/logs'
import { listensActions } from '@core/listens'
import { importerActions } from '@core/importer'

const initialState = new Map({
  [CURRENT_TRACKLIST_ADDRESS]: new Tracklist()
})

export function tracklistsReducer (state = initialState, action) {
  switch (action.type) {
    case tracklistActions.CLEAR_SEARCH:
    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACKS_PENDING:
    case tracklistActions.SEARCH_TRACKS:
    case tracklistActions.TOGGLE_TAG:
    case tracklistActions.LOAD_TRACKS:
    case listensActions.FETCH_LISTENS_PENDING:
    case listensActions.FETCH_LISTENS_FULFILLED:
    case listensActions.FETCH_LISTENS_FAILED:
    case listensActions.LOAD_LISTENS:
    case listensActions.POST_LISTEN_FULFILLED:
    case tracklistActions.POST_TRACK_FULFILLED:
    case importerActions.IMPORTER_PROCESSED_FILE:
    case trackActions.TRACK_ADDED:
    case logActions.LOG_INDEX_UPDATED:
      return state.set(
        CURRENT_TRACKLIST_ADDRESS,
        tracklistReducer(state.get(CURRENT_TRACKLIST_ADDRESS), action)
      )

    default:
      return state
  }
}
