import { race, call, put, fork, take, cancel, cancelled } from 'redux-saga/effects'
import { api, apiRequest } from '@core/api/service'
import { LOCATION_CHANGE } from 'react-router-redux'

import {
  setIdentityActions,
  getPrivateKeyActions
} from '@core/app'

import {
  contactlistRequestActions,
  contactlistPostActions,
  contactlistDeleteActions,
  allContactlistRequestActions,
  peerContactlistRequestActions
} from '@core/contactlists'
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
  contactRequestActions,
  contactConnectActions,
  contactDisconnectActions
} from '@core/contacts'
import {
  aboutPostActions
} from '@core/about'
import {
  playerShuffleRequestActions,
  playerTracksRequestActions
} from '@core/player'

function * fetchAPI (apiFunction, actions, opts = {}) {
  const { abort, request } = apiRequest(apiFunction, opts)
  try {
    yield put(actions.pending(opts.logId))
    const data = yield call(request)
    yield put(actions.fulfilled(opts.logId, data))
  } catch (err) {
    console.log(err)
    yield put(actions.failed(opts.logId, err))
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

export const fetchContacts = fetch.bind(null, api.fetchContacts, contactlistRequestActions)
export const postContact = fetch.bind(null, api.postContact, contactlistPostActions)
export const deleteContact = fetch.bind(null, api.deleteContact, contactlistDeleteActions)
export const requestConnectContact = fetch.bind(null, api.connectContact, contactConnectActions)
export const requestDisconnectContact = fetch.bind(null, api.disconnectContact, contactDisconnectActions)

export const fetchAllContacts = fetch.bind(null, api.fetchAllContacts, allContactlistRequestActions)
export const fetchPeers = fetch.bind(null, api.fetchPeers, peerContactlistRequestActions)

export const fetchInfo = fetch.bind(null, api.fetchInfo, infoRequestActions)

export const fetchTags = fetch.bind(null, api.fetchTags, taglistRequestActions)
export const postTag = fetch.bind(null, api.postTag, taglistPostActions)
export const deleteTag = fetch.bind(null, api.deleteTag, taglistDeleteActions)

export const fetchShuffleTracks = fetch.bind(null, api.fetchShuffleTracks, playerShuffleRequestActions)
export const fetchPlayerTracks = fetch.bind(null, api.fetchPlayerTracks, playerTracksRequestActions)
export const fetchTracks = fetch.bind(null, api.fetchTracks, tracklistRequestActions)
export const postTrack = fetch.bind(null, api.postTrack, tracklistPostActions)
export const deleteTrack = fetch.bind(null, api.deleteTrack, tracklistDeleteActions)

export const fetchContact = fetch.bind(null, api.fetchContact, contactRequestActions)
export const postAbout = fetch.bind(null, api.postAbout, aboutPostActions)

export const postIdentity = fetch.bind(null, api.postIdentity, setIdentityActions)
export const fetchPrivateKey = fetch.bind(null, api.fetchPrivateKey, getPrivateKeyActions)
