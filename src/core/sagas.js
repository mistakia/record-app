import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { contactlistSagas } from './contactlists'
import { feedSagas } from './feed'
import { infoSagas } from './info'
import { playerSagas } from './player'
import { taglistSagas } from './taglists'
import { tracklistSagas } from './tracklists'

export default function * rootSaga () {
  yield all([
    ...appSagas,
    ...contactlistSagas,
    ...feedSagas,
    ...infoSagas,
    ...playerSagas,
    ...taglistSagas,
    ...tracklistSagas
  ])
}
