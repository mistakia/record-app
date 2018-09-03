import { connect } from 'react-redux'
import { contactlistActions } from '@core/contactlists'

import Contact from './contact'

const ContactBase = ({ removeContact, contact, ...props }) => {
  if (!contact) {
    return null
  }

  const contactName = contact.isMe
    ? (contact.name || 'set your name')
    : (contact.alias || contact.name)

  const contactLocation = contact.isMe
    ? (contact.location || 'set your location')
    : contact.location

  const contactBio = contact.isMe
    ? (contact.bio || 'set your bio')
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
