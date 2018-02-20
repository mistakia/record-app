export const ipfsActions = {
  IPFS_INIT_FAILED: 'IPFS_INIT_FAILED',
  IPFS_INIT_FULFILLED: 'IPFS_INIT_FULFILLED',
  IPFS_INIT_PENDING: 'IPFS_INIT_PENDING',
  
  IPFS_INIT: 'IPFS_INIT',

  initFailed: error => ({
    type: ipfsActions.IPFS_INIT_FAILED,
    payload: error
  }),

  initFulfilled: data => ({
    type: ipfsActions.IPFS_INIT_FULFILLED,
    payload: data
  }),

  initPending: () => ({
    type: ipfsActions.IPFS_INIT_PENDING
  }),
  
  init: () => ({
    type: ipfsActions.IPFS_INIT
  })
}
