import { List } from 'immutable'

import { ITEMS_PER_LOAD } from '@core/constants'
import { feedActions } from './actions'
import { Feedlist } from './feedlist'

export function feedReducer (state = new Feedlist(), {payload, type}) {
  switch (type) {
    case feedActions.FETCH_FEED_FULFILLED:
      return state.withMutations(feedlist => {
        feedlist.merge({
          isPending: false,
          hasMore: payload.data.length === ITEMS_PER_LOAD,
          content: mergeContent(feedlist.content, payload.data)
        })
      })

    case feedActions.FETCH_FEED_PENDING:
      return state.set('isPending', true)

    case feedActions.LOAD_FEED:
      return new Feedlist()

    default:
      return state
  }
}

function mergeContent (content, collection) {
  let items = content.toJS()
  for (const item of collection) {
    items.push({
      contactId: item.contactId,
      timestamp: item.timestamp,
      type: item.entryType,
      id: item.entryId
    })
  }
  return new List(items)
}
