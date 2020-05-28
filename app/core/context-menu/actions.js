export const contextMenuActions = {
  SHOW_CONTEXT_MENU: 'SHOW_CONTEXT_MENU',
  HIDE_CONTEXT_MENU: 'HIDE_CONTEXT_MENU',

  hide: () => ({
    type: contextMenuActions.HIDE_CONTEXT_MENU
  }),

  show: ({ id, data, clickX, clickY }) => ({
    type: contextMenuActions.SHOW_CONTEXT_MENU,
    payload: {
      id,
      data,
      clickX,
      clickY
    }
  })
}
