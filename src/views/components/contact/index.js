import { connect } from 'react-redux'

import { contactlistActions } from '@core/contactlists'
import Confirm from '@components/confirm'
import { contactActions } from '@core/contacts'

import Contact from './contact'

const ContactBase = ({ removeContact, contact, ...props }) => {
  if (!contact) {
    return null
  }

  const contactName = contact.isMe
    ? (contact.name || contact.shortAddress)
    : (contact.alias || contact.name || contact.shortAddress)

  const contactLocation = contact.isMe
    ? (contact.location || 'Location')
    : contact.location

  const contactBio = contact.isMe
    ? (contact.bio || 'Bio')
    : contact.bio

  const remove = (event) => {
    event && event.stopPropagation && event.stopPropagation()
    Confirm({
      title: 'Unfollow',
      message: `Are you sure you want to unfollow ${contactName}`,
      detail: 'Unfollowing this library will eventually remove its data from your device',
      onConfirm: () => removeContact({ contactId: contact.id })
    })
  }

  return Contact({
    contact,
    remove,
    contactName,
    contactLocation,
    contactBio,
    ...props
  })
}

const mapDispatchToProps = {
  removeContact: contactlistActions.removeContact,
  connect: contactActions.connectContact,
  disconnect: contactActions.disconnectContact
}

export default connect(
  null,
  mapDispatchToProps
)(ContactBase)
