export const helpActions = {
  TOGGLE_HOME_HELP: 'TOGGLE_HOME_HELP',
  TOGGLE_TRACK_HELP: 'TOGGLE_TRACK_HELP',
  SET_HELP: 'SET_HELP',

  toggleHomeHelp: () => ({
    type: helpActions.TOGGLE_HOME_HELP
  }),

  toggleTrackHelp: () => ({
    type: helpActions.TOGGLE_TRACK_HELP
  }),

  setHelp: (help) => ({
    type: helpActions.SET_HELP,
    payload: {
      ...help
    }
  })
}
