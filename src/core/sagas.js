import { all } from 'redux-saga/effects'

import { dbSagas } from './db'
import { identitySagas } from './identities'
import { ipfsSagas } from './ipfs'
import { tracklistSagas } from './tracklist'


export default function* sagas() {
  yield all([
    ...dbSagas,
    ...identitySagas,
    ...ipfsSagas,
    ...tracklistSagas
  ])
}
