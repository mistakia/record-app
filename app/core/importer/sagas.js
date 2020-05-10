import { call, fork, takeLatest } from 'redux-saga/effects'
import { postImporter } from '@core/api'

import { importerActions } from './actions'

export function * importerAdd ({ payload }) {
  const { logAddress, data } = payload
  yield call(postImporter, { logAddress, data })
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
