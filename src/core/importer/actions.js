export const importerActions = {
  IMPORTER_STARTING: 'IMPORTER_STARTING',
  IMPORTER_FINISHED: 'IMPORTER_FINISHED',
  IMPORTER_PROCESSED_FILE: 'IMPORTER_PROCESSED_FILE',

  IMPORTER_ADD: 'IMPORTER_ADD',

  POST_IMPORTER_FAILED: 'POST_IMPORTER_FAILED',
  POST_IMPORTER_FULFILLED: 'POST_IMPORTER_FULFILLED',
  POST_IMPORTER_PENDING: 'POST_IMPORTER_PENDING',

  postImporterFailed: (address, error) => ({
    type: importerActions.POST_IMPORTER_FAILED,
    payload: {
      address,
      error
    }
  }),

  postImporterFulfilled: (address, data) => ({
    type: importerActions.POST_IMPORTER_FULFILLED,
    payload: {
      address,
      data
    }
  }),

  postImporterPending: address => ({
    type: importerActions.POST_IMPORTER_PENDING,
    payload: {
      address
    }
  }),

  add: (address, data) => ({
    type: importerActions.IMPORTER_ADD,
    payload: {
      address,
      data
    }
  })
}

export const importerPostActions = {
  failed: importerActions.postImporterFailed,
  fulfilled: importerActions.postImporterFulfilled,
  pending: importerActions.postImporterPending
}
