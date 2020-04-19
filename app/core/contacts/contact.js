import { Record, List } from 'immutable'

const getShortAddress = (address) => {
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
  avatar: null,
  name: null,
  displayName: null,
  shortAddress: null,
  location: null,
  bio: null,
  haveContact: false,
  isReplicating: false,
  isBuildingIndex: false,
  isProcessingIndex: false,
  latestHeadTimestamp: null,
  processingCount: 0,
  peers: new List(),
  isUpdating: false,
  trackCount: 0,
  contactCount: 0,
  max: 0,
  length: 0,
  isMe: false
})

export function createContact (data) {
  if (!data.content) {
    return
  }

  const shortAddress = getShortAddress(data.content.address)
  const displayName = data.content.alias || data.content.name || shortAddress
  const latestHead = data.heads.sort((a, b) => b.timestamp - a.timestamp)[0]

  return new Contact({
    shortAddress,
    displayName,
    id: data.id,
    latestHeadTimestamp: latestHead.payload.value.timestamp,
    address: data.content.address,
    alias: data.content.alias,
    avatar: data.content.avatar || data.avatar,
    name: data.content.name,
    location: data.content.location,
    bio: data.content.bio,
    peers: new List(data.peers),
    haveContact: !!data.haveContact,
    isMe: !!data.isMe,
    isReplicating: !!data.isReplicating,
    isBuildingIndex: !!data.isBuildingIndex,
    isProcessingIndex: !!data.isProcessingIndex,
    trackCount: data.trackCount,
    contactCount: data.contactCount,
    max: Math.max(data.heads.length && data.heads[0].clock.time, data.replicationStatus.max, 0),
    length: data.length
  })
}
