import { List, Record } from 'immutable'

export const Tracklist = new Record({
  id: null,
  isPending: false,
  isUpdating: false,
  hasMore: true,
  query: null,
  trackIds: new List(),
  searchTrackIds: new List()
})
