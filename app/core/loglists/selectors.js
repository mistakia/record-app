import { createSelector } from 'reselect'

import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import { getLogs, getLogByAddress, Log } from '@core/logs'
import { Loglist } from './loglist'

export function getLoglists (state) {
  return state.get('loglists')
}

export function getLoglistByAddress (state, address) {
  return getLoglists(state).get(address)
}

export function getCurrentLoglistAddress (state) {
  let loglists = getLoglists(state)
  return loglists.get('currentLoglistAddress')
}

export function getCurrentLoglist (state) {
  let loglists = getLoglists(state)
  return loglists.get(loglists.get('currentLoglistAddress')) || new Loglist()
}

export function getCurrentLoglistLog (state) {
  const address = getCurrentLoglistAddress(state)
  if (!address) {
    return new Log()
  }
  return getLogByAddress(state, address)
}

export function getPeerLoglist (state) {
  let loglists = getLoglists(state)
  return loglists.get(PEER_LOGLIST_ADDRESS) || new Loglist()
}

export function getAllLoglist (state) {
  let loglists = getLoglists(state)
  return loglists.get(ALL_LOGLIST_ADDRESS) || new Loglist()
}

export const getCurrentAddresses = createSelector(
  getCurrentLoglist,
  loglist => loglist.addresses
)

export const getPeerAddresses = createSelector(
  getPeerLoglist,
  loglist => loglist.addresses
)

export const getAllAddresses = createSelector(
  getAllLoglist,
  loglist => loglist.addresses
)

export const getLogsForCurrentLoglist = createSelector(
  getCurrentAddresses,
  getLogs,
  (addresses, logs) => {
    return addresses.map(address => logs.get(address))
  }
)

export const getLogsForPeerLoglist = createSelector(
  getPeerAddresses,
  getLogs,
  (addresses, logs) => {
    return addresses.map(address => logs.get(address))
  }
)

export const getLogsForAllLoglist = createSelector(
  getAllAddresses,
  getLogs,
  (addresses, logs) => {
    return addresses.map(address => logs.get(address))
  }
)
