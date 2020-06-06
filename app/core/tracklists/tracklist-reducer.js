import { List } from 'immutable'

import { ITEMS_PER_LOAD } from '@core/constants'
import { trackActions } from '@core/tracks'
import { tracklistActions } from './actions'
import { Tracklist } from './tracklist'
import { logActions } from '@core/logs'
import { mergeList } from '@core/utils'
import { listensActions } from '@core/listens'
import { importerActions } from '@core/importer'

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

    case listensActions.FETCH_LISTENS_FULFILLED:
    case tracklistActions.FETCH_TRACKS_FULFILLED:
      return state.withMutations(tracklist => {
        tracklist.merge({
          isPending: false,
          hasMore: payload.data.length === ITEMS_PER_LOAD,
          trackIds: mergeList(tracklist.trackIds, payload.data)
        })
      })

    case listensActions.POST_LISTEN_FULFILLED: {
      if (state.path !== '/listens') {
        return state
      }

      return state.merge({ isOutdated: true })
    }

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

    case importerActions.IMPORTER_PROCESSED_FILE: {
      if (!payload.track) {
        return state
      }

      let isOutdated = false
      for (const address of payload.addresses) {
        if (state.addresses.includes(address)) {
          isOutdated = true
          break
        }
      }

      return state.merge({ isOutdated: isOutdated || state.isOutdated })
    }

    case tracklistActions.POST_TRACK_FULFILLED:
    case trackActions.TRACK_ADDED: {
      const isOutdated = state.addresses.includes(payload.address)
      return state.merge({ isOutdated: isOutdated || state.isOutdated })
    }

    case logActions.LOG_INDEX_UPDATED: {
      if (!payload.data || !payload.data.length) {
        return state
      }

      const trackEntries = payload.data.filter(entry => entry.payload.value.type === 'track')
      if (!trackEntries.length) {
        return state
      }

      const isOutdated = state.addresses.includes(payload.address)
      return state.merge({ isOutdated: isOutdated || state.isOutdated })
    }

    case listensActions.FETCH_LISTENS_FAILED:
    case tracklistActions.FETCH_TRACKS_FAILED:
      return state.set('isPending', false)

    case listensActions.FETCH_LISTENS_PENDING:
    case tracklistActions.FETCH_TRACKS_PENDING:
      return state.set('isPending', true)

    case listensActions.LOAD_LISTENS:
      return state.merge({
        path: '/listens',
        trackIds: new List()
      })

    case tracklistActions.LOAD_TRACKS:
      return state.merge({
        isOutdated: false,
        path: payload.path,
        addresses: payload.addresses,
        sort: payload.sort,
        order: payload.order,
        query: payload.query,
        tags: payload.tags ? new List(payload.tags) : new List(),
        trackIds: new List()
      })

    default:
      return state
  }
}
