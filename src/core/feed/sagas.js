import { call, fork, select, takeLatest } from 'redux-saga/effects'

import { ITEMS_PER_LOAD } from '@core/constants'
import { fetchFeed } from '@core/api'
import { feedActions } from './actions'
import { getFeed } from './selectors'

export function * loadFeed () {
  const params = { start: 0, limit: ITEMS_PER_LOAD }
  yield call(fetchFeed, null, params)
}

export function * loadNextFeed () {
  const feed = yield select(getFeed)
  const start = feed.content.size
  const params = { start, limit: start + ITEMS_PER_LOAD }
  yield call(fetchFeed, null, params)
}

export function * watchLoadFeed () {
  yield takeLatest(feedActions.LOAD_FEED, loadFeed)
}

export function * watchLoadNextFeed () {
  yield takeLatest(feedActions.LOAD_NEXT_FEED, loadNextFeed)
}

export const feedSagas = [
  fork(watchLoadFeed),
  fork(watchLoadNextFeed)
]
