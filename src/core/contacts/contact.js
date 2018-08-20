import { Record } from 'immutable'

export const Contact = new Record({
  id: null,
  address: null,
  alias: null,
  avatar: '',
  name: '',
  location: '',
  bio: '',
  haveContact: false,
  isMe: false
})

export function createContact (data) {
  return new Contact({
    id: data._id,
    address: data.content.address,
    alias: data.content.alias,
    avatar: data.content.avatar || data.avatar,
    name: data.content.name,
    location: data.content.location,
    bio: data.content.bio,
    haveContact: !!data.haveContact,
    isMe: !!data.isMe
  })
}
