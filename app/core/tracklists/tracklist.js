import { List, Record } from 'immutable'

export const Tracklist = new Record({
  address: null,
  isPending: false, // when fetching / loading
  isUpdating: false, // when adding files
  hasMore: true,
  query: null,
  tags: new List(),
  trackIds: new List()
})
