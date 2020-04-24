import { all } from 'redux-saga/effects'

import { appSagas } from './app'
import { listensSagas } from './listens'
import { logsSagas } from './logs'
import { loglistSagas } from './loglists'
import { helpSagas } from './help'
import { infoSagas } from './info'
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
    ...infoSagas,
    ...helpSagas,
    ...playerSagas,
    ...aboutSagas,
    ...taglistSagas,
    ...trackSagas,
    ...tracklistSagas
  ])
}
