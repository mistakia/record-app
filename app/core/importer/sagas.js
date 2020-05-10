import { fork, takeLatest, put } from 'redux-saga/effects'
import { postImporter } from '@core/api'

import { notificationActions } from '@core/notifications'
import { importerActions } from './actions'

export function * importerAdd ({ payload }) {
  const { logAddress, data } = payload
  yield fork(postImporter, { logAddress, data })
  yield put(notificationActions.show({
    text: 'Starting import',
    dismiss: 2000
  }))
}

//= ====================================
//  WATCHERS
// -------------------------------------

export function * watchImporterAdd () {
  yield takeLatest(importerActions.IMPORTER_ADD, importerAdd)
}

//= ====================================
//  ROOT
// -------------------------------------

export const importerSagas = [
  fork(watchImporterAdd)
]
