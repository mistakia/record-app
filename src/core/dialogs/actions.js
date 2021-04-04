export const dialogActions = {
  SHOW_DIALOG: 'SHOW_DIALOG',
  CLOSE_DIALOG: 'CLOSE_DIALOG',

  show: ({ type, message, detail, onConfirm }) => ({
    type: dialogActions.SHOW_DIALOG,
    payload: {
      type,
      message,
      detail,
      onConfirm
    }
  }),

  close: () => ({
    type: dialogActions.CLOSE_DIALOG
  })
}
