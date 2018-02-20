import { List, Record } from 'immutable'

export const Tracklist = new Record({
  isPending: false,
  isLoaded: false,
  trackIds: new List()
})
