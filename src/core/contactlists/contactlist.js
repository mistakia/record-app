import { List, Record } from 'immutable'

export const Contactlist = new Record({
  id: null,
  isPending: false,
  contactIds: new List()
})
