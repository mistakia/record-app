import { call, put } from 'redux-saga/effects'
import { api } from '@core/api/service'

import {
  contactlistRequestActions,
  contactlistPostActions
} from '@core/contactlists'
import { feedRequestActions } from '@core/feed'
import { infoRequestActions } from '@core/info'
import {
  taglistRequestActions,
  taglistPostActions,
  taglistDeleteActions
} from '@core/taglists'
import {
  tracklistRequestActions,
  tracklistPostActions
} from '@core/tracklists'

function * fetchAPI (apiFunction, actions, id, param) {
  try {
    yield put(actions.pending(id))
    const data = yield call(apiFunction, id, param)
    yield put(actions.fulfilled(id, data))
  } catch (err) {
    console.log(err)
    yield put(actions.failed(err))
  }
}

export const fetchContacts = fetchAPI.bind(null, api.fetchContacts, contactlistRequestActions)
export const postContact = fetchAPI.bind(null, api.postContact, contactlistPostActions)

export const fetchFeed = fetchAPI.bind(null, api.fetchFeed, feedRequestActions)

export const fetchInfo = fetchAPI.bind(null, api.fetchInfo, infoRequestActions)

export const fetchTags = fetchAPI.bind(null, api.fetchTags, taglistRequestActions)
export const postTag = fetchAPI.bind(null, api.postTag, taglistPostActions)
export const deleteTag = fetchAPI.bind(null, api.deleteTag, taglistDeleteActions)

export const fetchTracks = fetchAPI.bind(null, api.fetchTracks, tracklistRequestActions)
export const postTrack = fetchAPI.bind(null, api.postTrack, tracklistPostActions)
