export function getNotifications (state) {
  return state.get('notifications')
}

export function getNotificationItem (state) {
  return getNotifications(state).get('items').first()
}
