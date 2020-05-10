export const notificationActions = {
  DISMISS_NOTIFICATION: 'DISMISS_NOTIFICATION',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',

  dismiss: () => ({
    type: notificationActions.DISMISS_NOTIFICATION
  }),

  show: (item) => ({
    type: notificationActions.SHOW_NOTIFICATION,
    payload: {
      item
    }
  })
}
