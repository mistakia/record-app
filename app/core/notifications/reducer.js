import { Map, List } from 'immutable'

import { notificationActions } from './actions'

export const initialState = new Map({
  items: new List()
})

export function notificationsReducer (state = initialState, { payload, type }) {
  switch (type) {
    case notificationActions.DISMISS_NOTIFICATION:
      return state.merge({
        items: state.get('items').shift()
      })

    case notificationActions.SHOW_NOTIFICATION:
      return state.merge({
        items: state.get('items').push(payload.item)
      })

    default:
      return state
  }
}
