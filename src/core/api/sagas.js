import { call, put } from 'redux-saga/effects'
import { api } from '@core/api/service'

import { initRequestActions } from '@core/db/actions'

import { tracklistRequestActions } from '@core/tracklists'

function* fetchAPI(apiFunction, actions, id, param) {
  try {
    yield put(actions.pending(id))
    const data = yield call(apiFunction, param || id)
    yield put(actions.fulfilled(id, data))
  } catch (err) {
    yield put(actions.failed(err))
  }
}

export const fetchInit = fetchAPI.bind(null, api.fetchInit, initRequestActions)
export const fetchTracks = fetchAPI.bind(null, api.fetchTracks, tracklistRequestActions)
