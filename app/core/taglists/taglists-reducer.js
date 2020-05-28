import { Map } from 'immutable'

import { taglistActions } from './actions'
import { taglistReducer } from './taglist-reducer'
import { CURRENT_TAGLIST_ADDRESS } from '@core/constants'

export const initialState = new Map()

// TODO update taglist on new entries (remote or local)

export function taglistsReducer (state = initialState, action) {
  switch (action.type) {
    case taglistActions.FETCH_TAGS_FULFILLED:
    case taglistActions.FETCH_TAGS_PENDING:
    case taglistActions.LOAD_TAGS:
      return state.set(
        CURRENT_TAGLIST_ADDRESS,
        taglistReducer(state.get(CURRENT_TAGLIST_ADDRESS), action)
      )

    default:
      return state
  }
}
