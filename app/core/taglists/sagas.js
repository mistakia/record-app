import { List } from 'immutable'
import { call, fork, takeLatest, takeLeading, select, put } from 'redux-saga/effects'

import history from '@core/history'
import { fetchTags, postTag, deleteTag } from '@core/api'
import { appActions } from '@core/app'
import { notificationActions } from '@core/notifications'
import { tracklistActions, getCurrentTracklist } from '@core/tracklists'
import { taglistActions } from './actions'

export function * loadTags ({ payload }) {
  const addresses = payload.addresses
  const params = { addresses }
  yield call(fetchTags, { params })
}

export function * addTag ({ payload }) {
  const { address, data } = payload
  if (!data.tag) return
  yield call(postTag, { address, data })
}

export function * removeTag ({ payload }) {
  const { address, data } = payload
  yield call(deleteTag, { address, data })
}

// make sure selected tags all exist - otherwise clear/reload
export function * checkSelectedTags ({ payload }) {
  let tracklist = yield select(getCurrentTracklist)
  const existingTags = payload.data.map(t => t.tag)

  if (history.location.pathname !== tracklist.path) return

  let selectedTags = tracklist.tags.toJS()
  let shouldClear = false
  for (const tag of selectedTags) {
    if (!existingTags.includes(tag)) {
      shouldClear = true
      break
    }
  }

  if (shouldClear) {
    tracklist = tracklist.set('tags', new List())
    const action = tracklistActions.loadTracks({ ...tracklist.toJS() })
    yield put(action)
  }
}

export function * postTagPending () {
  yield put(notificationActions.show({
    text: 'Adding tag',
    dismiss: 1250
  }))
}

export function * deleteTagFailed () {
  yield put(notificationActions.show({
    text: 'Failed to remove tag',
    dismiss: 2000
  }))
}

export function * postTagFailed () {
  yield put(notificationActions.show({
    text: 'Failed to add tag',
    dismiss: 2000
  }))
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

export function * watchDeleteTagFailed () {
  yield takeLatest(taglistActions.DELETE_TAG_FAILED, deleteTagFailed)
}

export function * watchPostTagFailed () {
  yield takeLatest(taglistActions.POST_TAG_FAILED, postTagFailed)
}

export function * watchPostTagPending () {
  yield takeLatest(taglistActions.POST_TAG_PENDING, postTagPending)
}

export const taglistSagas = [
  fork(watchLoadTags),
  fork(watchInitApp),
  fork(watchAddTag),
  fork(watchRemoveTag),
  fork(watchPostTagFulfilled),
  fork(watchDeleteTagFulfilled),
  fork(watchFetchTagsFulfilled),
  fork(watchPostTagPending),

  fork(watchDeleteTagFailed),
  fork(watchPostTagFailed)
]
