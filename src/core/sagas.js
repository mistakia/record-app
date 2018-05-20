import { all } from 'redux-saga/effects'

import { contactlistSagas } from './contactlists'
import { infoSagas } from './info'
import { tracklistSagas } from './tracklists'

export default function * rootSaga () {
  yield all([
    ...contactlistSagas,
    ...infoSagas,
    ...tracklistSagas
  ])
}
