import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import { loglistActions } from './actions'
import { logActions } from '@core/logs'
import { Loglist } from './loglist'
import { mergeList } from '@core/utils'

export function loglistReducer (state = new Loglist(), {payload, type}) {
  switch (type) {
    case loglistActions.FETCH_LOGS_FULFILLED:
    case loglistActions.FETCH_PEER_LOGS_FULFILLED:
    case loglistActions.FETCH_ALL_LOGS_FULFILLED:
    case logActions.LOG_LOADED:
      const data = Array.isArray(payload.data) ? payload.data : [payload.data]
      return state.withMutations(loglist => {
        loglist.merge({
          isPending: false,
          addresses: mergeList(loglist.addresses, data, 'content.address')
        })
      })

    case loglistActions.FETCH_LOGS_PENDING:
    case loglistActions.FETCH_PEER_LOGS_PENDING:
    case loglistActions.FETCH_ALL_LOGS_PENDING:
      return state.set('isPending', true)

    case loglistActions.LOAD_LOGS:
      return state.set('address', payload.address)

    case loglistActions.LOAD_PEER_LOGS:
      return state.set('address', PEER_LOGLIST_ADDRESS)

    case loglistActions.LOAD_ALL_LOGS:
      return state.set('address', ALL_LOGLIST_ADDRESS)

    default:
      return state
  }
}
