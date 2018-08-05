import { Map } from 'immutable'

import { taglistActions } from './actions'
import { taglistReducer } from './taglist-reducer'

export const initialState = new Map({
  currentTaglistId: null
})

export function taglistsReducer (state = initialState, action) {
  const { payload } = action

  switch (action.type) {
    case taglistActions.FETCH_TAGS_FULFILLED:
    case taglistActions.FETCH_TAGS_PENDING:
      return state.set(
        payload.logId,
        taglistReducer(state.get(payload.logId), action)
      )

    case taglistActions.LOAD_TAGS:
      return state.merge({
        currentTaglistId: payload.logId,
        [payload.logId]: taglistsReducer(state.get(payload.logId), action)
      })

    default:
      return state
  }
}
