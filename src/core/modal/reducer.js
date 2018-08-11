import { Map } from 'immutable'

import { modalActions } from './actions'

const initialState = new Map({
  type: null
})

export function modalReducer (state = initialState, { payload, type }) {
  switch (type) {
    case modalActions.SHOW_MODAL:
      return state.set('type', payload)

    case modalActions.HIDE_MODAL:
      return state.set('type', null)

    default:
      return state
  }
}
