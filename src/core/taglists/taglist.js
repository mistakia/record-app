import { List, Record } from 'immutable'

export const Taglist = new Record({
  id: null,
  isPending: false,
  tags: new List()
})
