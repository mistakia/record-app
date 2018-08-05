import { List, Record } from 'immutable'

export const Taglist = new Record({
  id: null,
  isNew: true,
  isPending: false,
  tags: new List()
})
