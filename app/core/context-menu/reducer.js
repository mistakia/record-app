import { Record } from 'immutable'
import { contextMenuActions } from './actions'

const ContextMenuState = new Record({
  id: null,
  visible: false,
  clickX: null,
  clickY: null,
  data: null
})

export function contextMenuReducer (state = new ContextMenuState(), { payload, type }) {
  switch (type) {
    case contextMenuActions.SHOW_CONTEXT_MENU:
      const { id, data, clickX, clickY } = payload
      return state.merge({
        id,
        data,
        clickX,
        clickY,
        visible: true
      })

    case contextMenuActions.HIDE_CONTEXT_MENU:
      return new ContextMenuState()

    default:
      return state
  }
}
