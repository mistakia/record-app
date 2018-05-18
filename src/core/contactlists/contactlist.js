import { List, Record } from 'immutable'

export const Contactlist = new Record({
  id: null,
  isNew: true,
  isPending: false,
  contactIds: new List()
})
