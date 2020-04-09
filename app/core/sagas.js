import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { contactSagas } from './contacts'
import { contactlistSagas } from './contactlists'
import { feedSagas } from './feed'
import { infoSagas } from './info'
import { playerSagas } from './player'
import { aboutSagas } from './about'
import { taglistSagas } from './taglists'
import { trackSagas } from './tracks'
import { tracklistSagas } from './tracklists'

export default function * rootSaga () {
  yield all([
    ...appSagas,
    ...contactSagas,
    ...contactlistSagas,
    ...feedSagas,
    ...infoSagas,
    ...playerSagas,
    ...aboutSagas,
    ...taglistSagas,
    ...trackSagas,
    ...tracklistSagas
  ])
}
