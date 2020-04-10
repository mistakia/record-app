import { call, fork, takeLatest, takeLeading, select } from 'redux-saga/effects'

import { fetchTags, postTag, deleteTag } from '@core/api'
import { appActions, getApp } from '@core/app'
import { taglistActions } from './actions'

export function * loadTags ({ payload }) {
  const app = yield select(getApp)
  const logId = payload.logId || app.address
  yield call(fetchTags, { logId })
}

export function * addTag ({ payload }) {
  const { logId, data } = payload
  if (!data.tag) return
  yield call(postTag, { logId, data })
}

export function * removeTag ({ payload }) {
  const { logId, data } = payload
  yield call(deleteTag, { logId, data })
}

export function * watchLoadTags () {
  yield takeLatest(taglistActions.LOAD_TAGS, loadTags)
}

export function * watchAddTag () {
  yield takeLatest(taglistActions.ADD_TAG, addTag)
}

export function * watchRemoveTag () {
  yield takeLatest(taglistActions.REMOVE_TAG, removeTag)
}

export function * watchInitApp () {
  yield takeLeading(appActions.INIT_APP, loadTags)
}

export function * watchPostTagFulfilled () {
  yield takeLatest(taglistActions.POST_TAG_FULFILLED, loadTags)
}

export function * watchDeleteTagFulfilled () {
  yield takeLatest(taglistActions.DELETE_TAG_FULFILLED, loadTags)
}

export const taglistSagas = [
  fork(watchLoadTags),
  fork(watchInitApp),
  fork(watchAddTag),
  fork(watchRemoveTag),
  fork(watchPostTagFulfilled),
  fork(watchDeleteTagFulfilled)
]
