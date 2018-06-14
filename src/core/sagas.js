import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { contactlistSagas } from './contactlists'
import { infoSagas } from './info'
import { tracklistSagas } from './tracklists'

export default function * rootSaga () {
  yield all([
    ...appSagas,
    ...contactlistSagas,
    ...infoSagas,
    ...tracklistSagas
  ])
}
