export const helpActions = {
  TOGGLE_HOME_HELP: 'TOGGLE_HOME_HELP',
  SET_HELP: 'SET_HELP',

  toggleHomeHelp: () => ({
    type: helpActions.TOGGLE_HOME_HELP
  }),

  setHelp: (help) => ({
    type: helpActions.SET_HELP,
    payload: {
      ...help
    }
  })
}
