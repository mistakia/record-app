export const helpActions = {
  TOGGLE_TRACKS_HELP: 'TOGGLE_TRACKS_HELP',
  TOGGLE_MY_LOGS_HELP: 'TOGGLE_MY_LOGS_HELP',
  TOGGLE_MY_TRACKS_HELP: 'TOGGLE_MY_TRACKS_HELP',
  SET_HELP: 'SET_HELP',

  toggleTracksHelp: () => ({
    type: helpActions.TOGGLE_TRACKS_HELP
  }),

  toggleMyLogsHelp: () => ({
    type: helpActions.TOGGLE_MY_LOGS_HELP
  }),

  toggleMyTracksHelp: () => ({
    type: helpActions.TOGGLE_MY_TRACKS_HELP
  }),

  setHelp: (help) => ({
    type: helpActions.SET_HELP,
    payload: {
      ...help
    }
  })
}
