import { List, Record } from 'immutable'

export const Feedlist = new Record({
  isPending: false,
  hasMore: true,
  content: new List()
})
