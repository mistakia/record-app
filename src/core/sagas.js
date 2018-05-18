import { all } from 'redux-saga/effects'

import { contactlistSagas } from './contactlists'
import { dbSagas } from './db'
import { tracklistSagas } from './tracklists'


export default function* rootSaga() {
  yield all([
    ...contactlistSagas,
    ...dbSagas,
    ...tracklistSagas
  ])
}
