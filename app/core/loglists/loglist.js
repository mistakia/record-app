import { List, Record } from 'immutable'

export const Loglist = new Record({
  address: null,
  isPending: false,
  isUpdating: false,
  logAddresses: new List()
})
