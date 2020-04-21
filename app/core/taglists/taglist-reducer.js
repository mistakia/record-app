import { List } from 'immutable'

import { taglistActions } from './actions'
import { Taglist } from './taglist'

export function taglistReducer (state = new Taglist(), { payload, type }) {
  switch (type) {
    case taglistActions.FETCH_TAGS_FULFILLED:
      return state.withMutations(taglist => {
        taglist.merge({
          isPending: false,
          tags: new List(payload.data)
        })
      })

    case taglistActions.FETCH_TAGS_PENDING:
      return state.set('isPending', true)

    case taglistActions.LOAD_TAGS:
      return state.set('address', payload.logAddress)

    default:
      return state
  }
}
