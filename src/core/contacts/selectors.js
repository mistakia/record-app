export function getContacts(state) {
  return state.get('contacts')
}

export function getContactById(state, contactId) {
  return getContacts(state).get(contactId)
}
