export const appActions = {
  INIT_APP: 'INIT_APP',

  CONTACTS_CONNECTED: 'CONTACTS_CONNECTED',
  CONTACTS_DISCONNECTED: 'CONTACTS_DISCONNECTED',

  initApp: (data) => ({
    type: appActions.INIT_APP,
    payload: data
  })
}
