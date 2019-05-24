import { call, put, fork, take, cancel, cancelled } from 'redux-saga/effects'
import { api, apiRequest } from '@core/api/service'
import { LOCATION_CHANGE } from 'react-router-redux'

import {
  contactlistRequestActions,
  contactlistPostActions,
  contactlistDeleteActions,
  suggestedContactlistRequestActions,
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
  tracklistRequestActions,
  tracklistPostActions
} from '@core/tracklists'
import {
  profileRequestActions,
  profilePostActions
} from '@core/profiles'

function * fetchAPI (apiFunction, actions, opts = {}) {
  const { abort, request } = apiRequest(apiFunction, opts)
  try {
    yield put(actions.pending(opts.logId))
    const data = yield call(request)
    yield put(actions.fulfilled(opts.logId, data))
  } catch (err) {
    console.log(err)
    yield put(actions.failed(err))
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

export const fetchSuggestedContacts = fetch.bind(null, api.fetchSuggestedContacts, suggestedContactlistRequestActions)
export const fetchPeers = fetch.bind(null, api.fetchPeers, peerContactlistRequestActions)

export const fetchFeed = fetch.bind(null, api.fetchFeed, feedRequestActions)

export const fetchInfo = fetch.bind(null, api.fetchInfo, infoRequestActions)

export const fetchTags = fetch.bind(null, api.fetchTags, taglistRequestActions)
export const postTag = fetch.bind(null, api.postTag, taglistPostActions)
export const deleteTag = fetch.bind(null, api.deleteTag, taglistDeleteActions)

export const fetchTrack = fetch.bind(null, api.fetchTrack, trackRequestActions)
export const fetchTracks = fetch.bind(null, api.fetchTracks, tracklistRequestActions)
export const postTrack = fetch.bind(null, api.postTrack, tracklistPostActions)

export const fetchProfile = fetch.bind(null, api.fetchProfile, profileRequestActions)
export const postProfile = fetch.bind(null, api.postProfile, profilePostActions)
