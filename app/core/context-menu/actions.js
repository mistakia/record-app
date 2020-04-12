export const contextMenuActions = {
  SHOW_CONTEXT_MENU: 'SHOW_CONTEXT_MENU',
  HIDE_CONTEXT_MENU: 'HIDE_CONTEXT_MENU',

  hide: () => ({
    type: contextMenuActions.HIDE_CONTEXT_MENU
  }),

  show: ({ id, trackId, clickX, clickY }) => ({
    type: contextMenuActions.SHOW_CONTEXT_MENU,
    payload: {
      id,
      trackId,
      clickX,
      clickY
    }
  })
}
