import { List, Record } from 'immutable'

export const Tracklist = new Record({
  path: null,
  addresses: new List(),
  sort: null,
  order: 'desc',
  isOutdated: false, // when new tracks have been added (sync, chrome extension, etc)
  isPending: false, // when fetching / loading
  hasMore: true,
  query: null,
  tags: new List(),
  trackIds: new List()
})
