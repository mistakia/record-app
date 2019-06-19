import { ReplicationStats } from './contact'

export function getContacts (state) {
  return state.get('contacts')
}

export function getContactById (state, contactId) {
  return getContacts(state).get(contactId)
}

export function getContactByAddress (state, address) {
  const contact = getContacts(state).find(contact => contact.get('address') === address)
  return contact
}

export function getContactMe (state) {
  const address = state.get('app').get('address')
  return getContactByAddress(state, address)
}

export function getReplicationStats (state) {
  const contacts = getContacts(state)

  let result = new ReplicationStats().toJSON()

  for (const contact of contacts.values()) {
    const stats = contact.get('replicationStats')
    for (const key in result) {
      result[key] += stats[key]
    }
  }

  return result
}

export function getReplicationProgress (state) {
  const contacts = getContacts(state)
  let result = {
    progress: 0,
    total: 0
  }

  for (const contact of contacts.values()) {
    const contactStats = contact.get('replicationStats')
    const contactStatus = contact.get('replicationStatus')

    result.progress += Math.max(contactStats.tasksProcessed, contactStatus.progress)
    result.total += contactStatus.max
  }

  return result
}
