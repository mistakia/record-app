export function getContacts (state) {
  return state.get('contacts')
}

export function getAllContacts (state) {
  const contacts = getContacts(state)
  let res = []
  for (const contact of contacts.keys()) {
    res.push(contacts.get(contact))
  }

  return res
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

export function getReplicationProgress (state) {
  const contacts = getContacts(state)
  let result = {
    progress: 0,
    total: 0

  }
  for (const contact of contacts.values()) {
    const length = contact.get('length')
    const max = contact.get('max')
    result.progress += length
    result.total += Math.max(max, length)
  }

  return result
}
