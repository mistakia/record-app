import { takeLatest, fork, put, call } from 'redux-saga/effects'
import { ipfs } from '@core/ipfs/service'
import { ipfsActions } from '@core/ipfs'


export function* initIPFS() {
  try {
    yield put(ipfsActions.initPending())
    const data = yield call(ipfs.init)
    yield put(ipfsActions.initFulfilled(data))
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
