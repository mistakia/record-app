import { List, Record } from 'immutable'

export const Tracklist = new Record({
  id: null,
  isNew: true,
  isPending: false,
  hasMore: true,
  trackIds: new List()
})
