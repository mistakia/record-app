export const appActions = {
  INIT_APP: 'INIT_APP',

  CONTACTS_CONNECTED: 'CONTACTS_CONNECTED',
  CONTACTS_DISCONNECTED: 'CONTACTS_DISCONNECTED',

  initApp: ({ address, isReplicating }) => ({
    type: appActions.INIT_APP,
    payload: { address, isReplicating }
  })
}
