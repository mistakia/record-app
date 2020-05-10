import { Map, List } from 'immutable'

import { loglistActions } from '@core/loglists'
import { logActions } from './actions'
import { createLog } from './log'

export function logsReducer (state = new Map(), {payload, type}) {
  switch (type) {
    case loglistActions.FETCH_LOGS_FULFILLED:
    case loglistActions.FETCH_PEER_LOGS_FULFILLED:
    case loglistActions.FETCH_ALL_LOGS_FULFILLED:
      return state.withMutations(logs => {
        payload.data.forEach(logData => {
          logs.set(logData.content.address, createLog(logData))
        })
      })

    case logActions.LOG_LOADED:
    case logActions.LOG_LOADING:
    case logActions.FETCH_LOG_FULFILLED:
      return state.withMutations(logs => {
        logs.set(payload.data.content.address, createLog(payload.data))
      })

    case logActions.LOG_REPLICATED:
      return state.withMutations(logs => {
        const log = logs.get(payload.logAddress)
        if (log) {
          logs.setIn([payload.logAddress, 'length'], payload.length)
          if (payload.replicationStatus.max > log.max) {
            logs.setIn([payload.logAddress, 'max'], payload.replicationStatus.max)
          }
        }
      })

    case logActions.LOG_REPLICATE_PROGRESS:
      return state.withMutations(logs => {
        const log = logs.get(payload.logAddress)
        if (log) {
          logs.setIn([payload.logAddress, 'length'], payload.length)
          if (payload.replicationStatus.max > log.max) {
            logs.setIn([payload.logAddress, 'max'], payload.replicationStatus.max)
          }
        }
      })

    case logActions.LOG_CONNECTED:
      return state.withMutations(logs => {
        const log = logs.get(payload.logAddress)
        if (log) {
          logs.setIn([payload.logAddress, 'isReplicating'], true)
        }
      })

    case logActions.LOG_DISCONNECTED:
      return state.withMutations(logs => {
        const log = logs.get(payload.logAddress)
        if (log) {
          logs.setIn([payload.logAddress, 'isReplicating'], false)
        }
      })

    case loglistActions.DELETE_LOG_LINK_FULFILLED:
      return state.withMutations(logs => {
        logs.setIn([payload.data.linkAddress, 'isLinked'], false)
        logs.setIn([payload.data.linkAddress, 'isUpdating'], false)
      })

    case logActions.CONNECT_LOG_PENDING:
    case logActions.DISCONNECT_LOG_PENDING:
    case loglistActions.DELETE_LOG_LINK_PENDING:
    case loglistActions.POST_LOG_PENDING:
      return state.withMutations(logs => {
        logs.setIn([payload.logAddress, 'isUpdating'], true)
      })

    case logActions.DISCONNECT_LOG_FAILED:
    case logActions.DISCONNECT_LOG_FULFILLED:
    case logActions.CONNECT_LOG_FULFILLED:
    case logActions.CONNECT_LOG_FAILED:
    case loglistActions.POST_LOG_FAILED:
    case loglistActions.POST_LOG_FULFILLED:
    case loglistActions.DELETE_LOG_LINK_FAILED:
      return state.withMutations(logs => {
        logs.setIn([payload.logAddress, 'isUpdating'], false)
      })

    case logActions.RECORD_PEER_JOINED:
    case logActions.LOG_PEER_JOINED:
      return state.withMutations(logs => {
        const log = logs.get(payload.logAddress)
        if (log) {
          logs.setIn([payload.logAddress, 'peers'], mergePeers(log.peers, [payload.peerId]))
        }
      })

    case logActions.RECORD_PEER_LEFT:
      return state.withMutations(logs => {
        logs.map((log) => {
          const idx = log.peers.indexOf(payload.peerId)
          if (idx > 0) log.peers.delete(idx)
        })
      })

    case logActions.LOG_INDEX_UPDATED:
      if (!state.get(payload.logAddress)) {
        return state
      }

      const data = JSON.parse(JSON.stringify(payload))
      const { isProcessingIndex, processingCount } = data
      const item = { isProcessingIndex, processingCount }
      if (data.trackCount) item.trackCount = data.trackCount
      if (data.logCount) item.logCount = data.logCount

      return state.withMutations(logs => {
        logs.mergeIn([payload.logAddress], item)
      })

    default:
      return state
  }
}

function mergePeers (peerList, collection) {
  let peers = peerList.toJS()
  let newPeers = collection.reduce((list, peer) => {
    if (peers.indexOf(peer) === -1) list.push(peer)
    return list
  }, [])

  return newPeers.length ? new List(peers.concat(newPeers)) : peerList
}
