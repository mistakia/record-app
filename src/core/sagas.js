import { all } from 'redux-saga/effects'

import { dbSagas } from './db'
import { tracklistSagas } from './tracklists'


export default function* sagas() {
  yield all([
    ...dbSagas,
    ...tracklistSagas
  ])
}
