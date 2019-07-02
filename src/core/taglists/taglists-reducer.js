import { Map, List } from 'immutable'

import { taglistActions } from './actions'
import { taglistReducer } from './taglist-reducer'
import { tracklistActions } from '@core/tracklists'

export const initialState = new Map({
  currentSelectedTags: new List(),
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
        [payload.logId]: taglistReducer(undefined, action)
      })

    case tracklistActions.SEARCH_TRACKS:
    case tracklistActions.LOAD_TRACKS:
      const { tags } = payload
      const t = tags && !Array.isArray(tags) ? [tags] : tags
      return state.merge({
        currentSelectedTags: t ? new List(t) : new List()
      })

    default:
      return state
  }
}
