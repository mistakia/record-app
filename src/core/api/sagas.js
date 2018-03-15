import { call, put } from 'redux-saga/effects'
import { api } from '@core/api/service'

import { initRequestActions, loadRequestActions } from '@core/db/actions'

function* fetchAPI(apiFunction, actions, param) {
  try {
    yield put(actions.pending())
    const data = yield call(apiFunction, param)
    yield put(actions.fulfilled(data))
  } catch (err) {
    yield put(actions.failed(err))
  }
}

export const fetchInit = fetchAPI.bind(null, api.fetchInit, initRequestActions)
export const fetchAddress = fetchAPI.bind(null, api.fetchAddress, loadRequestActions)
