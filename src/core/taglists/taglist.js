import { List, Record } from 'immutable'

export const Taglist = new Record({
  isPending: false,
  tags: new List()
})
