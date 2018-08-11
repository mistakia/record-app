export const modalTypes = {
  TRACK_MODAL: 'TRACK_MODAL'
}

export const modalActions = {
  SHOW_MODAL: 'SHOW_MODAL',
  HIDE_MODAL: 'HIDE_MODAL',

  hideModal: () => ({
    type: modalActions.HIDE_MODAL
  }),

  showModal: type => ({
    type: modalActions.SHOW_MODAL,
    payload: type
  }),

  showTrackModal: () => (modalActions.showModal(modalTypes.TRACK_MODAL))
}
