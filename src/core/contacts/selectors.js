export function getContacts (state) {
  return state.get('contacts')
}

export function getContactById (state, contactId) {
  return getContacts(state).get(contactId)
}

export function getContactByAddress (state, address) {
  const contact = getContacts(state).find(contact => contact.get('address') === address)
  console.log(contact)
  return contact
}

export function getContactMe (state) {
  const address = state.get('app').get('address')
  return getContactByAddress(state, address)
}
