import { call, put } from 'redux-saga/effects'
import { api } from '@core/api/service'

import {
  contactlistRequestActions,
  contactlistPostActions
} from '@core/contactlists'
import { infoRequestActions } from '@core/info'
import { tracklistRequestActions } from '@core/tracklists'

function * fetchAPI (apiFunction, actions, id, param) {
  try {
    yield put(actions.pending(id))
    const data = yield call(apiFunction, id, param)
    yield put(actions.fulfilled(id, data))
  } catch (err) {
    yield put(actions.failed(err))
  }
}

export const fetchContacts = fetchAPI.bind(null, api.fetchContacts, contactlistRequestActions)
export const fetchInfo = fetchAPI.bind(null, api.fetchInfo, infoRequestActions)
export const fetchTracks = fetchAPI.bind(null, api.fetchTracks, tracklistRequestActions)
export const postContact = fetchAPI.bind(null, api.postContact, contactlistPostActions)
