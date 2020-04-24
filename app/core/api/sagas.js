import { race, call, put, take, cancelled } from 'redux-saga/effects'
import { api, apiRequest } from '@core/api/service'
import { LOCATION_CHANGE } from 'react-router-redux'

import {
  setIdentityActions,
  getPrivateKeyActions
} from '@core/app'

import {
  loglistRequestActions,
  loglistPostActions,
  loglistDeleteActions,
  allLoglistRequestActions,
  peerLoglistRequestActions
} from '@core/loglists'
import { infoRequestActions } from '@core/info'
import {
  taglistRequestActions,
  taglistPostActions,
  taglistDeleteActions
} from '@core/taglists'
import {
  tracklistRequestActions,
  tracklistPostActions,
  tracklistDeleteActions
} from '@core/tracklists'
import {
  logRequestActions,
  logDeleteActions,
  logConnectActions,
  logDisconnectActions
} from '@core/logs'
import {
  aboutPostActions
} from '@core/about'
import {
  playerShuffleRequestActions,
  playerTracksRequestActions
} from '@core/player'
import {
  listensRequestActions,
  listenPostActions
} from '@core/listens'

function * fetchAPI (apiFunction, actions, opts = {}) {
  const { abort, request } = apiRequest(apiFunction, opts)
  try {
    yield put(actions.pending(opts.logAddress))
    const data = yield call(request)
    yield put(actions.fulfilled(opts.logAddress, data))
  } catch (err) {
    console.log(err)
    yield put(actions.failed(opts.logAddress, err))
  } finally {
    if (yield cancelled()) {
      abort()
    }
  }
}

function * fetch (...args) {
  yield race([
    call(fetchAPI.bind(null, ...args)),
    take(LOCATION_CHANGE) // TODO: make optional, not all requests should be cancelled
  ])
}

export const fetchLogs = fetch.bind(null, api.fetchLogs, loglistRequestActions)
export const postLogLink = fetch.bind(null, api.postLogLink, loglistPostActions)
export const deleteLogLink = fetch.bind(null, api.deleteLogLink, loglistDeleteActions)
export const requestConnectLog = fetch.bind(null, api.connectLog, logConnectActions)
export const requestDisconnectLog = fetch.bind(null, api.disconnectLog, logDisconnectActions)

export const fetchAllLogs = fetch.bind(null, api.fetchAllLogs, allLoglistRequestActions)
export const fetchPeers = fetch.bind(null, api.fetchPeers, peerLoglistRequestActions)

export const fetchInfo = fetch.bind(null, api.fetchInfo, infoRequestActions)

export const fetchTags = fetch.bind(null, api.fetchTags, taglistRequestActions)
export const postTag = fetch.bind(null, api.postTag, taglistPostActions)
export const deleteTag = fetch.bind(null, api.deleteTag, taglistDeleteActions)

export const fetchShuffleTracks = fetch.bind(null, api.fetchTracks, playerShuffleRequestActions)
export const fetchPlayerTracks = fetch.bind(null, api.fetchTracks, playerTracksRequestActions)
export const fetchTracks = fetch.bind(null, api.fetchTracks, tracklistRequestActions)
export const postTrack = fetch.bind(null, api.postTrack, tracklistPostActions)
export const deleteTrack = fetch.bind(null, api.deleteTrack, tracklistDeleteActions)

export const fetchLog = fetch.bind(null, api.fetchLog, logRequestActions)
export const postAbout = fetch.bind(null, api.postAbout, aboutPostActions)

export const postIdentity = fetch.bind(null, api.postIdentity, setIdentityActions)
export const fetchPrivateKey = fetch.bind(null, api.fetchPrivateKey, getPrivateKeyActions)

export const deleteLog = fetch.bind(null, api.deleteLog, logDeleteActions)

export const fetchListens = fetch.bind(null, api.fetchListens, listensRequestActions)
export const postListen = fetch.bind(null, api.postListen, listenPostActions)
