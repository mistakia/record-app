import { Record } from 'immutable'

import { notificationActions } from './actions'

export const initialState = new Record({
  text: null,
  severity: null,
  key: null,
  action: null,
  dismiss: null
})

export function notificationReducer (state = initialState(), { payload, type }) {
  switch (type) {
    case notificationActions.SHOW_NOTIFICATION:
      return state.merge({ key: new Date().getTime(), ...payload })

    default:
      return state
  }
}
