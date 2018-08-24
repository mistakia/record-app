export const appActions = {
  INIT_APP: 'INIT_APP',

  initApp: address => ({
    type: appActions.INIT_APP,
    payload: address
  })
}
