import { all } from 'redux-saga/effects'

import { dbSagas } from './db'


export default function* sagas() {
  yield all([
    ...dbSagas
  ])
}
