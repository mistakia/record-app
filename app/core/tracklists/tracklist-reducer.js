import { List } from 'immutable'

import { ITEMS_PER_LOAD } from '@core/constants'
import { trackActions } from '@core/tracks'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'
import { contactActions } from '@core/contacts'
import { mergeIds } from '@core/utils'

export function tracklistReducer (state = new Tracklist(), {payload, type}) {
  switch (type) {
    case tracklistActions.CLEAR_SEARCH:
      return state.withMutations(tracklist => {
        tracklist.merge({
          query: null,
          trackIds: new List()
        })
      })

    case tracklistActions.SEARCH_TRACKS:
      return state.withMutations(tracklist => {
        const { query } = payload
        tracklist.merge({ query, trackIds: new List() })
      })

    case tracklistActions.FETCH_TRACKS_FULFILLED:
      const hasQuery = !!state.get('query')
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          hasMore: hasQuery ? false : payload.data.length === ITEMS_PER_LOAD,
          trackIds: mergeIds(tracklist.trackIds, payload.data)
        })
      })

    case tracklistActions.TOGGLE_TAG:
      const { tag } = payload
      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: new List(),
          tags: state.tags.includes(tag)
            ? state.tags.splice(state.tags.indexOf(tag), 1)
            : state.tags.push(tag)
        })
      })

    case tracklistActions.POST_TRACK_FULFILLED:
    case trackActions.TRACK_ADDED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: mergeIds(tracklist.trackIds, [payload.data])
        })
      })

    case contactActions.CONTACT_INDEX_UPDATED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          trackIds: mergeIds(tracklist.trackIds, [payload.entry.payload.value])
        })
      })

    case tracklistActions.POST_TRACK_PENDING:
      return state.set('isUpdating', true)

    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set('isPending', true)

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        id: payload.logId,
        query: payload.query,
        tags: payload.tags ? new List(payload.tags) : new List()
      })

    default:
      return state
  }
}
