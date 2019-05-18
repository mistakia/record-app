import { Record } from 'immutable'

const shortAddress = (address) => {
  const parts = address.toString()
    .split('/')
    .filter((e, i) => !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb'))
    .filter(e => e !== '' && e !== ' ')

  const multihash = parts[0]
  return `${multihash.slice(0, 5)}...${multihash.slice(-5)}`
}

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
  if (!data.content) {
    return
  }

  console.log(data)

  return new Contact({
    id: data._id,
    address: data.content.address,
    alias: data.content.alias,
    avatar: data.content.avatar || data.avatar,
    name: data.content.name,// || shortAddress(data.content.address),
    location: data.content.location,
    bio: data.content.bio,
    haveContact: !!data.haveContact,
    isMe: !!data.isMe
  })
}
