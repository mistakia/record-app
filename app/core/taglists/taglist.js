import { List, Record } from 'immutable'

export const Taglist = new Record({
  address: null,
  isPending: false,
  tags: new List()
})
