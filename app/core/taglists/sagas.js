import { call, fork, takeLatest, takeLeading, select, put } from 'redux-saga/effects'

import history from '@core/history'
import { fetchTags, postTag, deleteTag } from '@core/api'
import { appActions, getApp } from '@core/app'
import { tracklistActions, getCurrentSelectedTags } from '@core/tracklists'
import { taglistActions } from './actions'

export function * loadTags ({ payload }) {
  const app = yield select(getApp)
  const logAddress = payload.logAddress || app.address
  yield call(fetchTags, { logAddress })
}

export function * addTag ({ payload }) {
  const { logAddress, data } = payload
  if (!data.tag) return
  yield call(postTag, { logAddress, data })
}

export function * removeTag ({ payload }) {
  const { logAddress, data } = payload
  yield call(deleteTag, { logAddress, data })
}

// make sure selected tags all exist - otherwise clear
export function * checkSelectedTags ({ payload }) {
  const { logAddress } = payload
  const existingTags = payload.data.map(t => t.tag)

  if (history.location.pathname !== `/tracks${logAddress}`) return

  let selectedTags = yield select(getCurrentSelectedTags)
  let shouldClear = false
  for (const tag of selectedTags) {
    if (!existingTags.includes(tag)) {
      shouldClear = true
      break
    }
  }

  if (shouldClear) {
    const action = tracklistActions.loadTracks({ logAddress, tags: [], query: null })
    yield put(action)
  }
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

export function * watchFetchTagsFulfilled () {
  yield takeLatest(taglistActions.FETCH_TAGS_FULFILLED, checkSelectedTags)
}

export const taglistSagas = [
  fork(watchLoadTags),
  fork(watchInitApp),
  fork(watchAddTag),
  fork(watchRemoveTag),
  fork(watchPostTagFulfilled),
  fork(watchDeleteTagFulfilled),
  fork(watchFetchTagsFulfilled)
]
