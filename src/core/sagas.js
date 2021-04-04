import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { listensSagas } from './listens'
import { logsSagas } from './logs'
import { loglistSagas } from './loglists'
import { helpSagas } from './help'
import { importerSagas } from './importer'
import { infoSagas } from './info'
import { notificationSagas } from './notifications'
import { playerSagas } from './player'
import { aboutSagas } from './about'
import { taglistSagas } from './taglists'
import { trackSagas } from './tracks'
import { tracklistSagas } from './tracklists'

export default function * rootSaga () {
  yield all([
    ...appSagas,
    ...listensSagas,
    ...logsSagas,
    ...loglistSagas,
    ...importerSagas,
    ...infoSagas,
    ...helpSagas,
    ...notificationSagas,
    ...playerSagas,
    ...aboutSagas,
    ...taglistSagas,
    ...trackSagas,
    ...tracklistSagas
  ])
}
