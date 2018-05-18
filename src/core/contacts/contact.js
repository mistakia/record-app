import { Record } from 'immutable'

export const Contact = new Record({
  id: null,
  address: null,
  alias: null
})

export function createContact(data) {
  return new Contact({
    id: data._id,
    address: data.content.address,
    alias: data.content.alias
  })
}
