export const importerActions = {
  IMPORTER_STARTING: 'IMPORTER_STARTING',
  IMPORTER_FINISHED: 'IMPORTER_FINISHED',
  IMPORTER_PROCESSED_FILE: 'IMPORTER_PROCESSED_FILE',

  IMPORTER_ADD: 'IMPORTER_ADD',

  POST_IMPORTER_FAILED: 'POST_IMPORTER_FAILED',
  POST_IMPORTER_FULFILLED: 'POST_IMPORTER_FULFILLED',
  POST_IMPORTER_PENDING: 'POST_IMPORTER_PENDING',

  postImporterFailed: (logAddress, error) => ({
    type: importerActions.POST_IMPORTER_FAILED,
    payload: {
      logAddress,
      error
    }
  }),

  postImporterFulfilled: (logAddress, data) => ({
    type: importerActions.POST_IMPORTER_FULFILLED,
    payload: {
      logAddress,
      data
    }
  }),

  postImporterPending: logAddress => ({
    type: importerActions.POST_IMPORTER_PENDING,
    payload: {
      logAddress
    }
  }),

  add: (logAddress, data) => ({
    type: importerActions.IMPORTER_ADD,
    payload: {
      logAddress,
      data
    }
  })
}

export const importerPostActions = {
  failed: importerActions.postImporterFailed,
  fulfilled: importerActions.postImporterFulfilled,
  pending: importerActions.postImporterPending
}
