import { Map } from 'immutable'

import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import { loglistActions } from './actions'
import { loglistReducer } from './loglist-reducer'
import { logActions } from '@core/logs'

export const initialState = new Map({
  currentLoglistAddress: null
})

export function loglistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case loglistActions.FETCH_LOGS_FULFILLED:
    case loglistActions.FETCH_LOGS_PENDING:
    case loglistActions.FETCH_PEER_LOGS_PENDING:
    case loglistActions.FETCH_PEER_LOGS_FULFILLED:
    case loglistActions.FETCH_ALL_LOGS_PENDING:
    case loglistActions.FETCH_ALL_LOGS_FULFILLED:
      return state.set(
        payload.logAddress,
        loglistReducer(state.get(payload.logAddress), action)
      )

    case logActions.LOG_LOADED:
      return state.set(
        ALL_LOGLIST_ADDRESS,
        loglistReducer(state.get(ALL_LOGLIST_ADDRESS), action)
      )

    case loglistActions.POST_LOG_FAILED:
    case loglistActions.POST_LOG_FULFILLED:
      return state.setIn([payload.logAddress, 'isUpdating'], false)

    case loglistActions.POST_LOG_PENDING:
      return state.setIn([payload.logAddress, 'isUpdating'], true)

    case loglistActions.LOAD_LOGS:
      return state.merge({
        currentLoglistAddress: payload.logAddress,
        [payload.logAddress]: loglistReducer(undefined, action)
      })

    case loglistActions.LOAD_PEER_LOGS:
      return state.merge({
        [PEER_LOGLIST_ADDRESS]: loglistReducer(undefined, action)
      })

    case loglistActions.LOAD_ALL_LOGS:
      return state.merge({
        [ALL_LOGLIST_ADDRESS]: loglistReducer(undefined, action)
      })

    default:
      return state
  }
}
