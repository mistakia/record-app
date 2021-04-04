export const notificationActions = {
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',

  show: ({ text, severity, action, dismiss }) => ({
    type: notificationActions.SHOW_NOTIFICATION,
    payload: {
      text,
      severity,
      action,
      dismiss
    }
  })
}
