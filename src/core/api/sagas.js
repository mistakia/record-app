import { call, put, fork, take, cancel, cancelled } from 'redux-saga/effects'
import { api, apiRequest } from '@core/api/service'
import { LOCATION_CHANGE } from 'react-router-redux'

import {
  contactlistRequestActions,
  contactlistPostActions,
  contactlistDeleteActions,
  allContactlistRequestActions,
  peerContactlistRequestActions
} from '@core/contactlists'
import { feedRequestActions } from '@core/feed'
import { infoRequestActions } from '@core/info'
import {
  taglistRequestActions,
  taglistPostActions,
  taglistDeleteActions
} from '@core/taglists'
import {
  trackRequestActions,
  tracklistSearchActions,
  tracklistRequestActions,
  tracklistPostActions,
  tracklistDeleteActions
} from '@core/tracklists'
import {
  contactRequestActions
} from '@core/contacts'
import {
  aboutPostActions
} from '@core/about'

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
  const task = yield fork(fetchAPI.bind(null, ...args))
  yield take(LOCATION_CHANGE) // TODO: make optional, not all requests should be cancelled
  yield cancel(task)
}

export const fetchContacts = fetch.bind(null, api.fetchContacts, contactlistRequestActions)
export const postContact = fetch.bind(null, api.postContact, contactlistPostActions)
export const deleteContact = fetch.bind(null, api.deleteContact, contactlistDeleteActions)

export const fetchAllContacts = fetch.bind(null, api.fetchAllContacts, allContactlistRequestActions)
export const fetchPeers = fetch.bind(null, api.fetchPeers, peerContactlistRequestActions)

export const fetchFeed = fetch.bind(null, api.fetchFeed, feedRequestActions)

export const fetchInfo = fetch.bind(null, api.fetchInfo, infoRequestActions)

export const fetchTags = fetch.bind(null, api.fetchTags, taglistRequestActions)
export const postTag = fetch.bind(null, api.postTag, taglistPostActions)
export const deleteTag = fetch.bind(null, api.deleteTag, taglistDeleteActions)

export const fetchTrack = fetch.bind(null, api.fetchTrack, trackRequestActions)
export const fetchTracks = fetch.bind(null, api.fetchTracks, tracklistRequestActions)
export const queryTracks = fetch.bind(null, api.fetchTracks, tracklistSearchActions)
export const postTrack = fetch.bind(null, api.postTrack, tracklistPostActions)
export const deleteTrack = fetch.bind(null, api.deleteTrack, tracklistDeleteActions)

export const fetchContact = fetch.bind(null, api.fetchContact, contactRequestActions)
export const postAbout = fetch.bind(null, api.postAbout, aboutPostActions)
