import { Record } from 'immutable'

import { helpActions } from './actions'

const HelpState = new Record({
  isTracksHelpVisible: false,
  isMyTracksHelpVisible: false,
  isMyLogsHelpVisible: false
})

export function helpReducer (state = new HelpState(), { payload, type }) {
  switch (type) {
    case helpActions.TOGGLE_TRACKS_HELP:
      return state.merge({
        isTracksHelpVisible: !state.isTracksHelpVisible
      })

    case helpActions.TOGGLE_MY_TRACKS_HELP:
      return state.merge({
        isMyTracksHelpVisible: !state.isMyTracksHelpVisible
      })

    case helpActions.TOGGLE_MY_LOGS_HELP:
      return state.merge({
        isMyLogsHelpVisible: !state.isMyLogsHelpVisible
      })

    case helpActions.SET_HELP:
      return state.merge({
        ...payload
      })

    default:
      return state
  }
}
