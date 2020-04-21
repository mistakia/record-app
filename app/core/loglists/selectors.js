import { createSelector } from 'reselect'

import {
  PEER_LOGLIST_ADDRESS,
  ALL_LOGLIST_ADDRESS
} from '@core/constants'
import { getApp } from '@core/app'
import { getLogs, getLogByAddress, Log } from '@core/logs'
import { Loglist } from './loglist'

export function getLoglists (state) {
  return state.get('loglists')
}

export function getLoglistByAddress (state, logAddress) {
  return getLoglists(state).get(logAddress)
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
  const logAddress = getCurrentLoglistAddress(state)
  if (!logAddress) {
    return new Log()
  }
  return getLogByAddress(state, logAddress)
}

export function getPeerLoglist (state) {
  let loglists = getLoglists(state)
  return loglists.get(PEER_LOGLIST_ADDRESS) || new Loglist()
}

export function getAllLoglist (state) {
  let loglists = getLoglists(state)
  return loglists.get(ALL_LOGLIST_ADDRESS) || new Loglist()
}

export function getMyLoglistIsUpdating (state) {
  const { address } = getApp(state)
  const myLogList = getLoglistByAddress(state, address)
  return myLogList ? myLogList.isUpdating : null
}

export const getCurrentLogAddresses = createSelector(
  getCurrentLoglist,
  loglist => loglist.logAddresses
)

export const getPeerLogAddresses = createSelector(
  getPeerLoglist,
  loglist => loglist.logAddresses
)

export const getAllLogAddresses = createSelector(
  getAllLoglist,
  loglist => loglist.logAddresses
)

export const getLogsForCurrentLoglist = createSelector(
  getCurrentLogAddresses,
  getLogs,
  (logAddresses, logs) => {
    return logAddresses.map(address => logs.get(address))
  }
)

export const getLogsForPeerLoglist = createSelector(
  getPeerLogAddresses,
  getLogs,
  (logAddresses, logs) => {
    return logAddresses.map(address => logs.get(address))
  }
)

export const getLogsForAllLoglist = createSelector(
  getAllLogAddresses,
  getLogs,
  (logAddresses, logs) => {
    return logAddresses.map(address => logs.get(address))
  }
)
