import { Record } from 'immutable'

import { dialogActions } from './actions'

const DialogState = new Record({
  message: null,
  detail: null,
  onConfirm: null
})

export function dialogReducer (state = new DialogState(), { payload, type }) {
  switch (type) {
    case dialogActions.SHOW_DIALOG:
      return new DialogState(payload)

    case dialogActions.CLOSE_DIALOG:
      return DialogState()

    default:
      return state
  }
}
