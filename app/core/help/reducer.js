import { Record } from 'immutable'

import { helpActions } from './actions'

const HelpState = new Record({
  isHomeHelpVisible: false
})

export function helpReducer (state = new HelpState(), { payload, type }) {
  switch (type) {
    case helpActions.TOGGLE_HOME_HELP:
      return state.merge({
        isHomeHelpVisible: !state.isHomeHelpVisible
      })

    case helpActions.SET_HELP:
      return state.merge({
        ...payload
      })

    default:
      return state
  }
}
