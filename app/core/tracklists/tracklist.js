import { List, Record } from 'immutable'

export const Tracklist = new Record({
  id: null,
  isPending: false,
  isUpdating: false,
  hasMore: true,
  query: null,
  tags: new List(),
  trackIds: new List()
})
