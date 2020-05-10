export const notificationActions = {
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',

  dismiss: (id) => ({
    type: notificationActions.DISMISS_NOTIFICATION,
    payload: {
      id
    }
  }),

  show: (item) => ({
    type: notificationActions.SHOW_NOTIFICATION,
    payload: {
      item
    }
  })
}
