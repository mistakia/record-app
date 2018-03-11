import { call, put } from 'redux-saga/effects'
import { api } from '@core/api/service'

import { idRequestActions } from '@core/db/actions'

function* fetchAPI(apiFunction, actions) {
  try {
    yield put(actions.pending())
    const data = yield call(apiFunction)
    yield put(actions.fulfilled(data))
  } catch (err) {
    yield put(actions.failed(err))
  }
}

export const fetchId = fetchAPI.bind(null, api.fetchId, idRequestActions)
