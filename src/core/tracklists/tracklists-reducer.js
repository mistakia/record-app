import { Map } from 'immutable'

import { SESSION_TRACKLIST_ID } from '@core/constants'
import { tracklistActions } from './actions'
import { tracklistReducer } from './tracklist-reducer'
import { Tracklist } from './tracklist'

export const initialState = new Map({
  currentTracklistId: SESSION_TRACKLIST_ID,
  [SESSION_TRACKLIST_ID]: new Tracklist({id: SESSION_TRACKLIST_ID, isNew: false})
})

export function tracklistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case tracklistActions.FETCH_TRACKS_FULFILLED:
    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set(
        payload.logId,
        tracklistReducer(state.get(payload.logId), action)
      )

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        currentTracklistId: payload.logId,
        [payload.logId]: tracklistReducer(state.get(payload.logId), action)
      })

    default:
      return state
  }
}
