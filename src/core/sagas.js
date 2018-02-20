import { all } from 'redux-saga/effects'

import { identitySagas } from './identities'
import { tracklistSagas } from './tracklist'
import { ipfsSagas } from './ipfs'

export default function* sagas() {
  yield all([
    ...ipfsSagas,
    ...tracklistSagas,
    ...identitySagas
  ])
}
