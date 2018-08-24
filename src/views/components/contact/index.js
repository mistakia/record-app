import { connect } from 'react-redux'
import { contactlistActions } from '@core/contactlists'

import Contact from './contact'

const ContactBase = ({ removeContact, contact, ...props }) => {
  const contactName = contact.isMe
    ? (contact.name || 'set your name')
    : (contact.alias || contact.name)

  const contactLocation = contact.isMe
    ? (contact.location || 'set your location')
    : contact.location

  const contactBio = contact.isMe
    ? (contact.bio || 'set your bio')
    : contact.bio

  removeContact = removeContact.bind(null, { contactId: contact.id })

  return Contact({
    contact,
    removeContact,
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
