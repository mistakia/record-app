import { takeLatest, fork, put, call } from 'redux-saga/effects'

import { dbActions } from '@core/db'
import { init } from '@core/ipfs/service'
import { ipfsActions } from '@core/ipfs'


export function* initIPFS() {
  try {
    yield put(ipfsActions.initPending())
    const data = yield call(init)
    yield put(ipfsActions.initFulfilled(data))

    const peerId = localStorage.getItem('peerId')
    const privateKey = peerId ? JSON.parse(localStorage.getItem(peerId)).privateKey : null
    yield put(dbActions.init(peerId, privateKey))
  } catch (error) {
    put(ipfsActions.initFailed(error))
  }
}

export function* watchIPFS_INIT() {
  yield takeLatest(ipfsActions.IPFS_INIT, initIPFS)
}

export const ipfsSagas = [
  fork(watchIPFS_INIT)
]
