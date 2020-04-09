import { createSelector } from 'reselect'

import { getTracks } from '@core/tracks'
import { getContacts } from '@core/contacts'

export function getFeed (state) {
  return state.get('feed')
}

export const getItemsForFeed = createSelector(
  getFeed,
  getTracks,
  getContacts,
  (feed, tracks, contacts) => {
    return feed.content.map((item) => {
      const { type, id, timestamp } = item
      return {
        contact: contacts.get(item.contactId),
        content: type === 'track' ? tracks.get(id) : contacts.get(id),
        type,
        timestamp
      }
    })
  }
)
