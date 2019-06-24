import { Record } from 'immutable'

const shortAddress = (address) => {
  const parts = address.toString()
    .split('/')
    .filter((e, i) => !((i === 0 || i === 1) && address.toString().indexOf('/orbit') === 0 && e === 'orbitdb'))
    .filter(e => e !== '' && e !== ' ')

  const multihash = parts[0]
  return `${multihash.slice(0, 5)}...${multihash.slice(-5)}`
}

export const ReplicationStatus = new Record({
  progress: 0,
  max: 0,
  buffered: 0,
  queued: 0
})

export function createReplicationStatus (data) {
  if (!data) {
    return new ReplicationStatus()
  }

  return new ReplicationStatus({
    progress: data.progress || 0,
    max: data.max || 0,
    buffered: data.buffered || 0,
    queued: data.queued || 0
  })
}

export const ReplicationStats = new Record({
  tasksRequested: 0,
  tasksStarted: 0,
  tasksProcessed: 0
})

export function createReplicationStats (data) {
  if (!data) {
    return new ReplicationStats()
  }

  return new ReplicationStats({
    tasksRequested: data.tasksRequested || 0,
    tasksStarted: data.tasksStarted || 0,
    tasksProcessed: data.tasksProcessed || 0
  })
}

export const Contact = new Record({
  id: null,
  address: null,
  alias: null,
  avatar: null,
  name: null,
  location: null,
  bio: null,
  haveContact: false,
  isReplicating: false,
  replicationStats: new ReplicationStats(),
  replicationStatus: new ReplicationStatus(),
  isMe: false
})

export function createContact (data) {
  if (!data.content) {
    return
  }

  return new Contact({
    id: data._id,
    address: data.content.address,
    alias: data.content.alias,
    avatar: data.content.avatar || data.avatar,
    name: data.content.name || shortAddress(data.content.address),
    location: data.content.location,
    bio: data.content.bio,
    haveContact: !!data.haveContact,
    isMe: !!data.isMe,
    isReplicating: !!data.isReplicating,
    replicationStats: createReplicationStats(data.replicationStats),
    replicationStatus: createReplicationStatus(data.replicationStatus)
  })
}
