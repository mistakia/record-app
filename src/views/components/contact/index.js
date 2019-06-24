import { connect } from 'react-redux'
import { contactlistActions } from '@core/contactlists'

import Contact from './contact'

const ContactBase = ({ removeContact, contact, ...props }) => {
  if (!contact) {
    return null
  }

  const contactName = contact.isMe
    ? (contact.name || contact.address)
    : (contact.alias || contact.name)

  const contactLocation = contact.isMe
    ? (contact.location || 'Location')
    : contact.location

  const contactBio = contact.isMe
    ? (contact.bio || 'Bio')
    : contact.bio

  const disconnect = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    removeContact({ contactId: contact.id })
  }

  return Contact({
    contact,
    disconnect,
    contactName,
    contactLocation,
    contactBio,
    ...props
  })
}

const mapDispatchToProps = {
  removeContact: contactlistActions.removeContact
}

export default connect(
  null,
  mapDispatchToProps
)(ContactBase)
