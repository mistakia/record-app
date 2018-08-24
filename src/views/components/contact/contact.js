import React from 'react'
import { Link, NavLink } from 'react-router-dom'

import Button from '@components/button'

import './contact.styl'

const Contact = ({
  contactName,
  contactLocation,
  contactBio,
  contact,
  type,
  removeContact
}) => {
  const connectAction = (
    <Link
      className='button'
      to={`/contacts/new/${contact.address}?alias=${contact.name || contact.alias}`}>
      Connect
    </Link>
  )

  const disconnectAction = (
    <Button className='button' onClick={removeContact}>Disconnect</Button>
  )

  const selfAction = (
    <Link className='button' to='/edit-profile'>Edit</Link>
  )

  const contactAction = (contact.isMe
    ? selfAction
    : (contact.haveContact
      ? disconnectAction
      : connectAction
    )
  )

  return (
    <article className={`contact contact__${type}`}>
      <img className='contact__avatar' src={contact.avatar} />
      <div className='contact__body'>
        <Link to={`/tracks${contact.address}`} className='contact__title'>
          {contactName}
        </Link>
        {contactLocation && <small>{contactLocation}</small>}
        <small>{contact.address}</small>
        {(type === 'profile' && contactLocation) && <div className='contact__bio'>
          {contactLocation}
        </div> }
        <div className='contact__action'>
          {type !== 'heading' && contactAction}
        </div>
      </div>
      { type === 'profile' && <div className='contact__menu'>
        <NavLink activeClassName='active' to={`/tracks${contact.address}`}>Tracks</NavLink>
        <NavLink activeClassName='active' to={`/contacts${contact.address}`}>Contacts</NavLink>
      </div> }
    </article>
  )
}

export default Contact
